(function () {
  "use strict";

  function startPlugin() {
    window.free_kp_extended_ready = true;

    // Навешиваем слушатель строго по структуре rezkacomment.js
    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite" || !e.data || !e.data.movie) return;

      // Очищаем старую кнопку, если она была создана
      $(".button--kp-main-plus").remove();

      // Создаем красивую кнопку "Кинопоиск+" рядом с "Смотреть" и "Трейлер"
      var btnHtml =
        '<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>';

      var btnContainer = $(".full-start-new__buttons").length
        ? $(".full-start-new__buttons")
        : $(".full-start__buttons");
      if (btnContainer.length) {
        btnContainer.append(btnHtml);
      }

      // Логика нажатия на кнопку
      $(".button--kp-main-plus").on("hover:enter", function () {
        var token = Lampa.Storage.get("kp_unofficial_token", "");

        // Если ключа нет — запрашиваем ввод
        if (!token) {
          Lampa.Input.edit(
            { title: "Введи API Ключ Кинопоиска", value: "", free: true },
            function (new_value) {
              if (new_value && new_value.trim()) {
                Lampa.Storage.set("kp_unofficial_token", new_value.trim());
                Lampa.Noty.show("Ключ сохранен! Нажмите кнопку еще раз.");
              }
            }
          );
          return;
        }

        // Если ключ есть — запускаем поиск фильма
        Lampa.Loading.start();

        var movie = e.data.movie || {};
        var movieTitle =
          movie.name ||
          movie.title ||
          movie.original_title ||
          movie.original_name ||
          "";
        var movieOriginalTitle =
          movie.original_title || movie.original_name || "";
        var movieYear = "";
        if (movie.release_date)
          movieYear = ("" + movie.release_date).slice(0, 4);
        else if (movie.first_air_date)
          movieYear = ("" + movie.first_air_date).slice(0, 4);

        // Умный поиск ID Кинопоиска: kinopoisk_id → imdb_id → поиск по названию
        findKpId(movie, token, function (kpid) {
          Lampa.Loading.stop();
          if (kpid) {
            openMenu(kpid, token, movieTitle, movieYear);
          } else {
            Lampa.Noty.show("Фильм не найден на Кинопоиске.");
          }
        });
      });
    });
  }

  // =========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =========================================================================

  // Нормализация строки для сравнения названий
  function normalizeStr(s) {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
      .replace(/[\s.,:;'`"!?]+/g, " ")
      .replace(/ё/g, "е")
      .trim();
  }

  // Многоуровневая стратегия поиска ID Кинопоиска
  function findKpId(movie, token, callback) {
    // 1. Если в данных Lampa уже есть kinopoisk_id — используем сразу
    var directKp =
      movie.kinopoisk_id || movie.kp_id || movie.id_kp || movie.kinopoiskId;
    if (directKp) {
      callback(directKp);
      return;
    }

    var movieTitle = movie.name || movie.title || "";
    var movieOriginalTitle = movie.original_title || movie.original_name || "";
    var movieYear = "";
    if (movie.release_date) movieYear = ("" + movie.release_date).slice(0, 4);
    else if (movie.first_air_date)
      movieYear = ("" + movie.first_air_date).slice(0, 4);

    // 2. Если есть imdb_id — ищем через него (намного надёжнее названия)
    if (movie.imdb_id) {
      fetch(
        "https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=" +
          encodeURIComponent(movie.imdb_id),
        {
          method: "GET",
          headers: { "X-API-KEY": token, "Content-Type": "application/json" },
        }
      )
        .then(function (res) {
          return res.json();
        })
        .then(function (json) {
          if (
            json &&
            json.items &&
            json.items.length > 0 &&
            (json.items[0].kinopoiskId || json.items[0].filmId)
          ) {
            callback(json.items[0].kinopoiskId || json.items[0].filmId);
          } else {
            searchByName(
              movieTitle,
              movieOriginalTitle,
              movieYear,
              token,
              callback
            );
          }
        })
        .catch(function () {
          searchByName(
            movieTitle,
            movieOriginalTitle,
            movieYear,
            token,
            callback
          );
        });
      return;
    }

    // 3. Ищем по названию + году
    searchByName(movieTitle, movieOriginalTitle, movieYear, token, callback);
  }

  // Поиск по названию со строгим сравнением года и скорингом
  function searchByName( movieTitle, movieOriginalTitle, movieYear, token, callback ) {
    if (!movieTitle && !movieOriginalTitle) {
      Lampa.Loading.stop();
      Lampa.Noty.show("Не удалось определить название фильма.");
      callback(null);
      return;
    }

    var queryStr = movieTitle || movieOriginalTitle;
    var searchQuery = encodeURIComponent(queryStr);

    fetch(
      "https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=" +
        searchQuery,
      {
        method: "GET",
        headers: { "X-API-KEY": token, "Content-Type": "application/json" },
      }
    )
      .then(function (res) {
        return res.json();
      })
      .then(function (searchJson) {
        if (!searchJson || !searchJson.films || searchJson.films.length === 0) {
          callback(null);
          return;
        }

        var normTitle = normalizeStr(movieTitle);
        var normOrig = normalizeStr(movieOriginalTitle);
        var mYear = parseInt(movieYear, 10);

        var bestMatch = null;
        var bestScore = -999;

        for (var f = 0; f < searchJson.films.length; f++) {
          var film = searchJson.films[f];
          var score = 0;

          // СТРОГОЕ сравнение годов (никакого indexOf!)
          var fYear = parseInt(film.year, 10);
          if (fYear && mYear) {
            if (fYear === mYear) score += 100; // точное совпадение года
            else if (Math.abs(fYear - mYear) === 1)
              score += 40; // разница ±1 год (баги баз)
            else score -= 60; // большой штраф за разный год
          }

          // Сравнение русских названий
          var fNameRu = normalizeStr(film.nameRu);
          if (normTitle && fNameRu) {
            if (fNameRu === normTitle) score += 80;
            else if (
              fNameRu.indexOf(normTitle) !== -1 ||
              normTitle.indexOf(fNameRu) !== -1
            )
              score += 40;
          }

          // Сравнение оригинальных названий
          var fNameOrig = normalizeStr(film.nameOriginal);
          if (normOrig && fNameOrig) {
            if (fNameOrig === normOrig) score += 80;
            else if (
              fNameOrig.indexOf(normOrig) !== -1 ||
              normOrig.indexOf(fNameOrig) !== -1
            )
              score += 40;
          }

          // Бонус за тип "FILM" / "TV_SERIES" (не "VIDEO")
          if (
            film.type === "FILM" ||
            film.type === "TV_SERIES" ||
            film.type === "MINI_SERIES"
          )
            score += 5;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = film.filmId;
          }
        }

        // Если даже лучший результат имеет сильный штраф за год —
        // возможно фильм не тот. Но всё равно вернём лучшее, что нашли.
        if (bestMatch === null) {
          bestMatch = searchJson.films[0].filmId;
        }

        callback(bestMatch);
      })
      .catch(function () {
        Lampa.Loading.stop();
        Lampa.Noty.show("Ошибка поиска Кинопоиска.");
        callback(null);
      });
  }

  // =========================================================================
  // ГЛАВНОЕ МЕНЮ
  // =========================================================================

  function openMenu(kp_id, token, movieTitle, movieYear) {
    var items = [
      { title: "💡 Интересные факты", action: "facts" },
      { title: "🚫 Киноляпы и ошибки", action: "bloopers" },
      { title: "🏆 Награды и номинации", action: "awards" },
      { title: "📸 Кадры со съемок", action: "stills" },
      { title: "🖼 Официальные постеры", action: "posters" },
      { title: "👥 Похожие фильмы", action: "similars" },
      { title: "🔑 Сбросить / Изменить API Ключ", action: "reset_key" },
    ];

    Lampa.Select.show({
      title: "Материалы Кинопоиска",
      items: items,
      onSelect: function (item) {
        if (item.action === "reset_key") {
          Lampa.Input.edit(
            {
              title: "Изменить API Ключ",
              value: Lampa.Storage.get("kp_unofficial_token", ""),
              free: true,
            },
            function (new_val) {
              if (new_val)
                Lampa.Storage.set("kp_unofficial_token", new_val.trim());
              Lampa.Controller.toggle("content");
            }
          );
        } else if (item.action === "similars") {
          loadSimilars(kp_id, token, movieTitle, movieYear);
        } else {
          loadDataAndShow(
            kp_id,
            token,
            item.action,
            item.title,
            movieTitle,
            movieYear
          );
        }
      },
      onBack: function () {
        Lampa.Controller.toggle("content");
      },
    });
  }

  // =========================================================================
  // ПОХОЖИЕ ФИЛЬМЫ — с рабочим переходом
  // =========================================================================

  function loadSimilars(kp_id, token, movieTitle, movieYear) {
    Lampa.Loading.start();
    fetch(
      "https://kinopoiskapiunofficial.tech/api/v2.2/films/" +
        kp_id +
        "/similars",
      {
        method: "GET",
        headers: { "X-API-KEY": token, "Content-Type": "application/json" },
      }
    )
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        Lampa.Loading.stop();
        if (!json || !json.items || json.items.length === 0) {
          Lampa.Noty.show("Похожих фильмов не найдено.");
          Lampa.Controller.toggle("content");
          return;
        }

        var simItems = [];
        for (var s = 0; s < json.items.length; s++) {
          var it = json.items[s];
          var sName = it.nameRu || it.nameOriginal || "";
          if (!sName) continue;
          var displayTitle = sName + (it.year ? " (" + it.year + ")" : "");
          simItems.push({
            title: displayTitle,
            name: sName,
            original_name: it.nameOriginal || "",
            filmId: it.filmId,
            year: it.year || "",
          });
        }

        if (simItems.length === 0) {
          Lampa.Noty.show("Похожих фильмов не найдено.");
          Lampa.Controller.toggle("content");
          return;
        }

        Lampa.Select.show({
          title: "Похожие фильмы",
          items: simItems,
          onSelect: function (selectedSim) {
            // Сначала закрываем Select, потом открываем карточку
            openSimilarMovie(selectedSim, kp_id, token, movieTitle, movieYear);
          },
          onBack: function () {
            openMenu(kp_id, token, movieTitle, movieYear);
          },
        });
      })
      .catch(function () {
        Lampa.Loading.stop();
        Lampa.Noty.show("Ошибка загрузки похожих фильмов.");
      });
  }

  // Открытие карточки похожего фильма:
  // 1) Ищем в TMDB (через встроенный API Lampa, fallback — прямой fetch)
  // 2) ПРЕДВАРИТЕЛЬНО проверяем, что фильм реально существует в TMDB
  // (GET /movie/{id} или /tv/{id}) — иначе Activity.push({component:'full'})
  // даст бесконечную загрузку из-за 404
  // 3) Если всё ок — открываем карточку
  // 4) Если нет — fallback на страницу поиска Lampa
  function openSimilarMovie(sim, kp_id, token, movieTitle, movieYear) {
    Lampa.Loading.start();

    // Ищем по оригинальному названию — оно у Кинопоиска и TMDB совпадает почти всегда.
    // Русское название берём как fallback (если оригинального нет или оно не латиницей).
    var searchQuery = sim.original_name || sim.name;
    console.log(
      "[KP+] Opening similar:",
      sim.name,
      "| search query:",
      searchQuery
    );

    tmdbSearchAndVerify(searchQuery, sim, function (verifiedMovie) {
      Lampa.Loading.stop();
      if (verifiedMovie) {
        console.log("[KP+] Verified TMDB match:", verifiedMovie);
        pushActivityFull(verifiedMovie);
      } else {
        console.log("[KP+] No TMDB match, fallback to search page");
        fallbackToSearch(sim);
      }
    });
  }

  // Поиск в TMDB + проверка существования фильма перед открытием карточки
  function tmdbSearchAndVerify(query, sim, callback) {
    var tmdbKey =
      (Lampa.Storage && Lampa.Storage.get("tmdb_api_key")) ||
      "4ef0d7355db98881c8ad963f72945844";
    var searchUrl =
      "https://api.themoviedb.org/3/search/multi?api_key=" +
      tmdbKey +
      "&language=ru-RU&query=" +
      encodeURIComponent(query) +
      "&page=1&include_adult=false";

    fetch(searchUrl)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var picked = pickTmdbResult(data && data.results, sim);
        if (!picked) {
          // Если по оригинальному не нашли — пробуем по русскому названию
          if (sim.name && sim.name !== query) {
            var altUrl =
              "https://api.themoviedb.org/3/search/multi?api_key=" +
              tmdbKey +
              "&language=ru-RU&query=" +
              encodeURIComponent(sim.name) +
              "&page=1&include_adult=false";
            fetch(altUrl)
              .then(function (r2) {
                return r2.json();
              })
              .then(function (d2) {
                var picked2 = pickTmdbResult(d2 && d2.results, sim);
                if (picked2) verifyAndBuild(picked2, tmdbKey, callback);
                else callback(null);
              })
              .catch(function () {
                callback(null);
              });
          } else {
            callback(null);
          }
          return;
        }
        verifyAndBuild(picked, tmdbKey, callback);
      })
      .catch(function () {
        callback(null);
      });
  }

  // Дополнительная проверка: реально ли TMDB отдаёт данные по этому ID
  // (если 404 — карточка в Lampa зависнет навсегда, поэтому проверяем заранее)
  function verifyAndBuild(picked, tmdbKey, callback) {
    var method = picked.media_type === "tv" ? "tv" : "movie";
    var verifyUrl =
      "https://api.themoviedb.org/3/" +
      method +
      "/" +
      picked.id +
      "?api_key=" +
      tmdbKey +
      "&language=ru-RU";

    fetch(verifyUrl)
      .then(function (res) {
        if (!res.ok) {
          callback(null);
          return null;
        }
        return res.json();
      })
      .then(function (fullData) {
        if (!fullData) {
          callback(null);
          return;
        }

        // Берём уже ПОЛНЫЕ данные из verify-запроса — там есть всё,
        // что Lampa ожидает в карточке (жанры, длительность, seasons и т.д.)
        var movie = {
          id: fullData.id,
          title: fullData.title || fullData.name || "",
          name: fullData.name || fullData.title || "",
          original_title:
            fullData.original_title || fullData.original_name || "",
          original_name:
            fullData.original_name || fullData.original_title || "",
          release_date: fullData.release_date || "",
          first_air_date: fullData.first_air_date || "",
          poster_path: fullData.poster_path || "",
          backdrop_path: fullData.backdrop_path || "",
          overview: fullData.overview || "",
          runtime:
            fullData.runtime ||
            (fullData.episode_run_time && fullData.episode_run_time[0]) ||
            0,
          genres: fullData.genres || [],
          vote_average: fullData.vote_average || 0,
          vote_count: fullData.vote_count || 0,
          number_of_seasons: fullData.number_of_seasons || 0,
          number_of_episodes: fullData.number_of_episodes || 0,
          seasons: fullData.seasons || [],
          method: method,
          source: "tmdb",
        };
        callback(movie);
      })
      .catch(function () {
        callback(null);
      });
  }

  // Выбор лучшего результата из search/multi
  function pickTmdbResult(results, sim) {
    if (!results || !results.length) return null;
    var normSimName = normalizeStr(sim.name);
    var simYear = parseInt(sim.year, 10);

    // 1) Точное совпадение по названию + году
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.media_type !== "movie" && r.media_type !== "tv") continue;
      var rTitle = normalizeStr(r.title || r.name || "");
      var rOrig = normalizeStr(r.original_title || r.original_name || "");
      var rYear = parseInt(
        (r.release_date || r.first_air_date || "").slice(0, 4),
        10
      );

      var nameMatch =
        (rTitle && rTitle === normSimName) || (rOrig && rOrig === normSimName);
      var yearMatch = simYear && rYear && rYear === simYear;

      if (nameMatch && yearMatch) return r;
    }

    // 2) Совпадение по названию без года
    for (var j = 0; j < results.length; j++) {
      var r2 = results[j];
      if (r2.media_type !== "movie" && r2.media_type !== "tv") continue;
      var r2Title = normalizeStr(r2.title || r2.name || "");
      var r2Orig = normalizeStr(r2.original_title || r2.original_name || "");
      if (
        (r2Title && r2Title === normSimName) ||
        (r2Orig && r2Orig === normSimName)
      )
        return r2;
    }

    // 3) Первый movie/tv результат (если есть year, фильтруем по ±1 году)
    var fallback = null;
    for (var k = 0; k < results.length; k++) {
      var r3 = results[k];
      if (r3.media_type !== "movie" && r3.media_type !== "tv") continue;
      if (simYear) {
        var r3Year = parseInt(
          (r3.release_date || r3.first_air_date || "").slice(0, 4),
          10
        );
        if (r3Year && Math.abs(r3Year - simYear) <= 1) return r3;
      }
      if (!fallback) fallback = r3;
    }
    return fallback;
  }

  // Открытие карточки через Activity.push
  function pushActivityFull(movie) {
    // Закрываем Select и модалки перед открытием карточки
    try {
      Lampa.Controller.toggle("content");
    } catch (e) {}

    setTimeout(function () {
      Lampa.Activity.push({
        url: "",
        component: "full",
        movie: movie,
        source: "tmdb",
        method: movie.method,
        page: 1,
      });
    }, 200);
  }

  // Fallback: открываем страницу поиска Lampa
  function fallbackToSearch(sim) {
    try {
      Lampa.Controller.toggle("content");
    } catch (e) {}

    setTimeout(function () {
      Lampa.Activity.push({
        url: "",
        component: "search",
        query: sim.name,
        source: "tmdb",
        page: 1,
      });
    }, 200);
  }

  // =========================================================================
  // ЗАГРУЗКА КОНТЕНТА (факты / киноляпы / награды / кадры / постеры)
  // =========================================================================

  function loadDataAndShow( kp_id, token, action, menuTitle, movieTitle, movieYear ) {
    var url = "";
    if (action === "facts" || action === "bloopers")
      url = "v2.2/films/" + kp_id + "/facts";
    if (action === "awards") url = "v2.2/films/" + kp_id + "/awards";
    if (action === "stills")
      url = "v2.2/films/" + kp_id + "/images?type=STILL&page=1";
    if (action === "posters")
      url = "v2.2/films/" + kp_id + "/images?type=POSTER&page=1";

    Lampa.Loading.start();
    fetch("https://kinopoiskapiunofficial.tech/api/" + url, {
      method: "GET",
      headers: { "X-API-KEY": token, "Content-Type": "application/json" },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        Lampa.Loading.stop();
        var html =
          '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';

        if (action === "facts" || action === "bloopers") {
          var typeFilter = action === "facts" ? "FACT" : "BLOOPER";
          var count = 0;
          if (json && json.items) {
            for (var i = 0; i < json.items.length; i++) {
              if (json.items[i].type === typeFilter) {
                count++;
                var cleanText = json.items[i].text.replace(/<[^>]+>/g, "");
                var spoiler = json.items[i].spoiler
                  ? '<span style="color:#ff5252; font-weight:bold; background:rgba(255,82,82,0.15); padding:2px 6px; border-radius:4px; margin-right:6px; display:inline-block;">СПОЙЛЕР</span>'
                  : "";
                html +=
                  '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' +
                  spoiler +
                  cleanText +
                  "</div>";
              }
            }
          }
          if (count === 0)
            html +=
              '<div style="text-align:center; color:#aaa; padding:20px;">Ничего не найдено.</div>';
        } else if (action === "awards") {
          if (json && json.items && json.items.length > 0) {
            for (var j = 0; j < json.items.length; j++) {
              var a = json.items[j];
              var status = a.win
                ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>'
                : '<span style="color:#bbb;">⭐ Номинация</span>';
              html +=
                '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' +
                status +
                '<br><b style="color:#fff;">' +
                a.name +
                " (" +
                a.year +
                ')</b><br><span style="color:#aaa; font-size:0.95em;">' +
                a.nominationName +
                "</span></div>";
            }
          } else
            html +=
              '<div style="text-align:center; color:#aaa; padding:20px;">Наград не найдено.</div>';
        } else if (action === "stills" || action === "posters") {
          if (json && json.items && json.items.length > 0) {
            html += '<div style="text-align:center;">';
            var widthPercent = action === "stills" ? "92%" : "45%";
            for (var k = 0; k < json.items.length; k++) {
              html +=
                '<img src="' +
                json.items[k].previewUrl +
                '" style="width:' +
                widthPercent +
                '; margin:8px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);" />';
            }
            html += "</div>";
          } else
            html +=
              '<div style="text-align:center; color:#aaa; padding:20px;">Изображений не найдено.</div>';
        }

        html += "</div>";

        Lampa.Modal.open({
          title: menuTitle,
          html: $(html),
          size: "large",
          mask: true,
          onBack: function () {
            Lampa.Modal.close();
            openMenu(kp_id, token, movieTitle, movieYear);
          },
        });
      })
      .catch(function () {
        Lampa.Loading.stop();
        Lampa.Noty.show("Ошибка загрузки данных Кинопоиска.");
      });
  }

  if (!window.free_kp_extended_ready) startPlugin();
})();
