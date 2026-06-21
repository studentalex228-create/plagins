(function () {
  "use strict";

  /* ========================================================================= Кинопоиск+ — встраиваем контент Кинопоиска прямо на страницу фильма Lampa ========================================================================= */

  function startPlugin() {
    window.free_kp_extended_ready = true;

    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite" || !e.data || !e.data.movie) return;

      var movie = e.data.movie;
      var token = Lampa.Storage.get("kp_unofficial_token", "");

      // Удаляем старый блок, если он был
      $(".kp-extended-block").remove();

      // Если ключа нет — показываем плейсхолдер с кнопкой настройки
      if (!token) {
        renderPlaceholderBlock(movie);
        return;
      }

      // Ищем ID Кинопоиска и загружаем весь контент
      Lampa.Loading.start();
      findKpId(movie, token, function (kpid) {
        if (!kpid) {
          Lampa.Loading.stop();
          renderErrorBlock("Фильм не найден на Кинопоиске", movie);
          return;
        }
        loadAllKpContent(kpid, token, movie);
      });
    });
  }

  /* ========================================================================= 1. ПОИСК ID КИНОПОИСКА (умная стратегия) ========================================================================= */

  function normalizeStr(s) {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
      .replace(/[\s.,:;'`"!?]+/g, " ")
      .replace(/ё/g, "е")
      .trim();
  }

  function findKpId(movie, token, callback) {
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

    searchByName(movieTitle, movieOriginalTitle, movieYear, token, callback);
  }

  function searchByName( movieTitle, movieOriginalTitle, movieYear, token, callback ) {
    var queryStr = movieTitle || movieOriginalTitle;
    if (!queryStr) {
      callback(null);
      return;
    }

    fetch(
      "https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=" +
        encodeURIComponent(queryStr),
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

          var fYear = parseInt(film.year, 10);
          if (fYear && mYear) {
            if (fYear === mYear) score += 100;
            else if (Math.abs(fYear - mYear) === 1) score += 40;
            else score -= 60;
          }

          var fNameRu = normalizeStr(film.nameRu);
          if (normTitle && fNameRu) {
            if (fNameRu === normTitle) score += 80;
            else if (
              fNameRu.indexOf(normTitle) !== -1 ||
              normTitle.indexOf(fNameRu) !== -1
            )
              score += 40;
          }

          var fNameOrig = normalizeStr(film.nameOriginal);
          if (normOrig && fNameOrig) {
            if (fNameOrig === normOrig) score += 80;
            else if (
              fNameOrig.indexOf(normOrig) !== -1 ||
              normOrig.indexOf(fNameOrig) !== -1
            )
              score += 40;
          }

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

        if (bestMatch === null) bestMatch = searchJson.films[0].filmId;
        callback(bestMatch);
      })
      .catch(function () {
        callback(null);
      });
  }

  /* ========================================================================= 2. ЗАГРУЗКА ВСЕХ ДАННЫХ ПАРАЛЛЕЛЬНО ========================================================================= */

  function fetchKp(path, token, onSuccess, onError) {
    fetch("https://kinopoiskapiunofficial.tech/api/" + path, {
      method: "GET",
      headers: { "X-API-KEY": token, "Content-Type": "application/json" },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        onSuccess(json);
      })
      .catch(function () {
        onError();
      });
  }

  function loadAllKpContent(kpid, token, movie) {
    var pending = 5;
    var results = {
      facts: null,
      awards: null,
      stills: null,
      posters: null,
      similars: null,
    };

    function done() {
      pending--;
      if (pending === 0) {
        Lampa.Loading.stop();
        renderKpBlock(kpid, token, movie, results);
      }
    }

    fetchKp(
      "v2.2/films/" + kpid + "/facts",
      token,
      function (json) {
        results.facts = json;
        done();
      },
      function () {
        done();
      }
    );

    fetchKp(
      "v2.2/films/" + kpid + "/awards",
      token,
      function (json) {
        results.awards = json;
        done();
      },
      function () {
        done();
      }
    );

    fetchKp(
      "v2.2/films/" + kpid + "/images?type=STILL&page=1",
      token,
      function (json) {
        results.stills = json;
        done();
      },
      function () {
        done();
      }
    );

    fetchKp(
      "v2.2/films/" + kpid + "/images?type=POSTER&page=1",
      token,
      function (json) {
        results.posters = json;
        done();
      },
      function () {
        done();
      }
    );

    fetchKp(
      "v2.2/films/" + kpid + "/similars",
      token,
      function (json) {
        results.similars = json;
        done();
      },
      function () {
        done();
      }
    );
  }

  /* ========================================================================= 3. РЕНДЕР БЛОКА НА СТРАНИЦЕ ========================================================================= */

  function injectStyles() {
    if (document.getElementById("kp-extended-styles")) return;
    var style = document.createElement("style");
    style.id = "kp-extended-styles";
    style.textContent = ` .kp-extended-block { margin: 30px 0 10px 0; padding: 0; max-width: 100%; } .kp-extended-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: linear-gradient(90deg, rgba(255,102,0,0.18) 0%, rgba(255,102,0,0.05) 100%); border-left: 3px solid #f60; border-radius: 6px; margin-bottom: 16px; } .kp-extended-head__title { color: #f60; font-size: 1.3em; font-weight: 700; display: flex; align-items: center; gap: 8px; } .kp-extended-head__settings { color: #aaa; font-size: 0.85em; padding: 6px 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer; transition: all 0.15s; } .kp-extended-head__settings.focus, .kp-extended-head__settings:hover { color: #f60; border-color: #f60; } .kp-section { margin-bottom: 18px; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden; } .kp-section__title { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; color: #ddd; font-size: 1.05em; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; } .kp-section__title.focus, .kp-section__title:hover { background: rgba(255,255,255,0.05); } .kp-section__title-text { display: flex; align-items: center; gap: 8px; } .kp-section__count { color: #777; font-size: 0.85em; font-weight: 400; } .kp-section__toggle { color: #777; font-size: 0.9em; transition: transform 0.2s; } .kp-section.collapsed .kp-section__toggle { transform: rotate(-90deg); } .kp-section__content { padding: 12px 16px; } .kp-section.collapsed .kp-section__content { display: none; } .kp-fact-item, .kp-award-item { background: rgba(255,255,255,0.04); padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); line-height: 1.5; color: #ddd; font-size: 0.95em; } .kp-fact-item:last-child, .kp-award-item:last-child { margin-bottom: 0; } .kp-spoiler-tag { display: inline-block; color: #ff5252; font-weight: 700; background: rgba(255,82,82,0.15); padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-size: 0.85em; } .kp-award-win { color: #79D29E; font-weight: 700; } .kp-award-nom { color: #bbb; } .kp-award-name { color: #fff; font-weight: 600; margin: 4px 0; } .kp-award-nomname { color: #aaa; font-size: 0.9em; } .kp-images-row { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 6px; scrollbar-width: thin; } .kp-images-row::-webkit-scrollbar { height: 6px; } .kp-images-row::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; } .kp-thumb { flex-shrink: 0; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border 0.15s; } .kp-thumb.focus, .kp-thumb:hover { border-color: #f60; } .kp-thumb img { display: block; height: 160px; width: auto; } .kp-thumb--poster img { height: 220px; } .kp-similar-row { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 6px; scrollbar-width: thin; } .kp-similar-row::-webkit-scrollbar { height: 6px; } .kp-similar-row::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; } .kp-similar-card { flex-shrink: 0; width: 130px; cursor: pointer; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.05); border: 2px solid transparent; transition: all 0.15s; } .kp-similar-card.focus, .kp-similar-card:hover { border-color: #f60; transform: translateY(-2px); } .kp-similar-card__poster { width: 100%; height: 195px; object-fit: cover; display: block; background: #222; } .kp-similar-card__no-poster { width: 100%; height: 195px; display: flex; align-items: center; justify-content: center; background: #222; color: #555; font-size: 2em; } .kp-similar-card__title { padding: 8px; font-size: 0.85em; color: #ddd; line-height: 1.3; text-align: center; min-height: 36px; display: flex; align-items: center; justify-content: center; } .kp-similar-card__year { font-size: 0.8em; color: #777; text-align: center; padding-bottom: 8px; } .kp-empty { text-align: center; color: #777; padding: 16px; font-style: italic; } .kp-show-more { display: block; margin: 12px auto 0; padding: 8px 20px; background: rgba(255,102,0,0.1); color: #f60; border: 1px solid rgba(255,102,0,0.3); border-radius: 6px; cursor: pointer; font-size: 0.9em; transition: all 0.15s; } .kp-show-more.focus, .kp-show-more:hover { background: rgba(255,102,0,0.2); } .kp-placeholder { margin: 30px 0; padding: 20px; background: rgba(255,102,0,0.08); border: 1px dashed rgba(255,102,0,0.3); border-radius: 8px; text-align: center; } .kp-placeholder__title { color: #f60; font-size: 1.2em; font-weight: 700; margin-bottom: 8px; } .kp-placeholder__text { color: #aaa; margin-bottom: 14px; } .kp-placeholder__btn { display: inline-block; padding: 10px 24px; background: #f60; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600; } .kp-image-viewer { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 30px; } .kp-image-viewer img { max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.6); } `;
    document.head.appendChild(style);
  }

  function renderKpBlock(kpid, token, movie, results) {
    injectStyles();

    // Парсим данные
    var facts = [];
    var bloopers = [];
    if (results.facts && results.facts.items) {
      for (var i = 0; i < results.facts.items.length; i++) {
        var it = results.facts.items[i];
        var cleanText = it.text.replace(/<[^>]+>/g, "");
        var obj = { text: cleanText, spoiler: !!it.spoiler };
        if (it.type === "FACT") facts.push(obj);
        else if (it.type === "BLOOPER") bloopers.push(obj);
      }
    }

    var awards =
      results.awards && results.awards.items ? results.awards.items : [];
    var stills =
      results.stills && results.stills.items ? results.stills.items : [];
    var posters =
      results.posters && results.posters.items ? results.posters.items : [];
    var similars =
      results.similars && results.similars.items ? results.similars.items : [];

    // Собираем HTML
    var html = '<div class="kp-extended-block">';

    // Шапка
    html += '<div class="kp-extended-head">';
    html += ' <div class="kp-extended-head__title">✨ Кинопоиск+</div>';
    html +=
      ' <div class="kp-extended-head__settings selector" data-action="settings">⚙️ API ключ</div>';
    html += "</div>";

    // Секция: Интересные факты
    html += buildSection(
      "facts",
      "💡 Интересные факты",
      facts.length,
      function () {
        if (facts.length === 0)
          return '<div class="kp-empty">Фактов не найдено</div>';
        var s = "";
        var limit = facts.length;
        for (var i = 0; i < limit; i++) {
          var f = facts[i];
          var spoilerTag = f.spoiler
            ? '<span class="kp-spoiler-tag">СПОЙЛЕР</span>'
            : "";
          s +=
            '<div class="kp-fact-item">' +
            spoilerTag +
            escapeHtml(f.text) +
            "</div>";
        }
        return s;
      }
    );

    // Секция: Киноляпы (свёрнута по умолчанию, чтобы не портить впечатление)
    html += buildSection(
      "bloopers",
      "🚫 Киноляпы и ошибки",
      bloopers.length,
      function () {
        if (bloopers.length === 0)
          return '<div class="kp-empty">Киноляпов не найдено</div>';
        var s = "";
        for (var i = 0; i < bloopers.length; i++) {
          var b = bloopers[i];
          var spoilerTag = b.spoiler
            ? '<span class="kp-spoiler-tag">СПОЙЛЕР</span>'
            : "";
          s +=
            '<div class="kp-fact-item">' +
            spoilerTag +
            escapeHtml(b.text) +
            "</div>";
        }
        return s;
      },
      true
    ); // collapsed = true

    // Секция: Награды
    html += buildSection(
      "awards",
      "🏆 Награды и номинации",
      awards.length,
      function () {
        if (awards.length === 0)
          return '<div class="kp-empty">Наград не найдено</div>';
        var s = "";
        for (var i = 0; i < awards.length; i++) {
          var a = awards[i];
          var status = a.win
            ? '<span class="kp-award-win">🏆 Победа</span>'
            : '<span class="kp-award-nom">⭐ Номинация</span>';
          s += '<div class="kp-award-item">';
          s += status;
          s +=
            '<div class="kp-award-name">' +
            escapeHtml(a.name || "") +
            " (" +
            escapeHtml("" + a.year) +
            ")</div>";
          s +=
            '<div class="kp-award-nomname">' +
            escapeHtml(a.nominationName || "") +
            "</div>";
          s += "</div>";
        }
        return s;
      }
    );

    // Секция: Кадры со съемок
    html += buildImagesSection("stills", "📸 Кадры со съемок", stills, "still");

    // Секция: Постеры
    html += buildImagesSection(
      "posters",
      "🖼 Официальные постеры",
      posters,
      "poster"
    );

    // Секция: Похожие фильмы
    html += buildSimilarsSection(similars);

    html += "</div>";

    // Вставляем в DOM (после деталей, перед комментариями)
    var $block = $(html);
    var $details = $(".full-start-new__details");
    if ($details.length) $details.after($block);
    else $(".full-start-new, .full-start").append($block);

    // Стили: делаем кликабельные элементы видимыми для Lampa Controller
    $block
      .find(
        ".kp-section__title, .kp-thumb, .kp-similar-card, .kp-show-more, .kp-extended-head__settings"
      )
      .addClass("selector");

    // ===== Обработчики =====

    // Клик по заголовку секции — свернуть/развернуть
    $block.find(".kp-section__title").on("hover:enter", function () {
      var $sec = $(this).closest(".kp-section");
      $sec.toggleClass("collapsed");
    });

    // Настройки API ключа
    $block.find('[data-action="settings"]').on("hover:enter", function () {
      Lampa.Input.edit(
        {
          title: "API Ключ Кинопоиска",
          value: Lampa.Storage.get("kp_unofficial_token", ""),
          free: true,
        },
        function (new_val) {
          if (new_val) {
            Lampa.Storage.set("kp_unofficial_token", new_val.trim());
            Lampa.Noty.show("Ключ сохранен. Перезагрузите страницу фильма.");
          }
          Lampa.Controller.toggle("content");
        }
      );
    });

    // Клик по картинке — полноэкранный просмотр
    $block.find(".kp-thumb").on("hover:enter", function () {
      var fullUrl = $(this).data("full") || $(this).find("img").attr("src");
      showImageViewer(fullUrl);
    });

    // Клик по карточке похожего фильма — поиск через Lampa
    $block.find(".kp-similar-card").on("hover:enter", function () {
      var name = $(this).data("name");
      var origName = $(this).data("orig-name");
      // Сначала пробуем оригинальное название (TMDB его лучше понимает)
      var query = origName || name;
      Lampa.Activity.push({
        url: "",
        component: "search",
        query: query,
        source: "tmdb",
        page: 1,
      });
    });
  }

  function buildSection(id, title, count, contentFn, collapsed) {
    var collapsedClass = collapsed ? " collapsed" : "";
    var html =
      '<div class="kp-section' +
      collapsedClass +
      '" data-section="' +
      id +
      '">';
    html += ' <div class="kp-section__title selector">';
    html +=
      ' <span class="kp-section__title-text">' +
      title +
      ' <span class="kp-section__count">(' +
      count +
      ")</span></span>";
    html += ' <span class="kp-section__toggle">▼</span>';
    html += " </div>";
    html += ' <div class="kp-section__content">' + contentFn() + "</div>";
    html += "</div>";
    return html;
  }

  function buildImagesSection(id, title, items, type) {
    var modifier = type === "poster" ? " kp-thumb--poster" : "";
    var html = '<div class="kp-section" data-section="' + id + '">';
    html += ' <div class="kp-section__title selector">';
    html +=
      ' <span class="kp-section__title-text">' +
      title +
      ' <span class="kp-section__count">(' +
      items.length +
      ")</span></span>";
    html += ' <span class="kp-section__toggle">▼</span>';
    html += " </div>";
    html += ' <div class="kp-section__content">';
    if (items.length === 0) {
      html += '<div class="kp-empty">Изображений не найдено</div>';
    } else {
      html += '<div class="kp-images-row">';
      var limit = Math.min(items.length, 20);
      for (var i = 0; i < limit; i++) {
        var imgUrl = items[i].previewUrl || items[i].imageUrl || "";
        if (!imgUrl) continue;
        html +=
          '<div class="kp-thumb' +
          modifier +
          ' selector" data-full="' +
          (items[i].imageUrl || imgUrl) +
          '">';
        html += ' <img src="' + imgUrl + '" loading="lazy" alt="" />';
        html += "</div>";
      }
      html += "</div>";
      if (items.length > 20) {
        html +=
          '<div class="kp-empty" style="font-size:0.85em;">Показано 20 из ' +
          items.length +
          ". Полный список — на Кинопоиске.</div>";
      }
    }
    html += " </div>";
    html += "</div>";
    return html;
  }

  function buildSimilarsSection(similars) {
    var html = '<div class="kp-section" data-section="similars">';
    html += ' <div class="kp-section__title selector">';
    html +=
      ' <span class="kp-section__title-text">👥 Похожие фильмы <span class="kp-section__count">(' +
      similars.length +
      ")</span></span>";
    html += ' <span class="kp-section__toggle">▼</span>';
    html += " </div>";
    html += ' <div class="kp-section__content">';
    if (similars.length === 0) {
      html += '<div class="kp-empty">Похожих фильмов не найдено</div>';
    } else {
      html += '<div class="kp-similar-row">';
      for (var i = 0; i < similars.length; i++) {
        var s = similars[i];
        var name = s.nameRu || s.nameOriginal || "Без названия";
        var origName = s.nameOriginal || "";
        var year = s.year ? "" + s.year : "";
        var posterUrl = s.posterUrl || s.posterUrlPreview || "";

        html +=
          '<div class="kp-similar-card selector" data-name="' +
          escapeAttr(name) +
          '" data-orig-name="' +
          escapeAttr(origName) +
          '">';
        if (posterUrl) {
          html +=
            '<img class="kp-similar-card__poster" src="' +
            posterUrl +
            '" loading="lazy" alt="" />';
        } else {
          html += '<div class="kp-similar-card__no-poster">🎬</div>';
        }
        html +=
          ' <div class="kp-similar-card__title">' +
          escapeHtml(name) +
          "</div>";
        if (year)
          html +=
            '<div class="kp-similar-card__year">' + escapeHtml(year) + "</div>";
        html += "</div>";
      }
      html += "</div>";
    }
    html += " </div>";
    html += "</div>";
    return html;
  }

  function renderPlaceholderBlock(movie) {
    injectStyles();
    var html = '<div class="kp-extended-block">';
    html += '<div class="kp-placeholder">';
    html += ' <div class="kp-placeholder__title">✨ Кинопоиск+</div>';
    html +=
      ' <div class="kp-placeholder__text">Чтобы видеть факты, киноляпы, награды, кадры и похожие фильмы с Кинопоиска — введите API ключ.</div>';
    html +=
      ' <div class="kp-placeholder__btn selector" data-action="setup">Ввести API ключ</div>';
    html += "</div>";
    html += "</div>";

    var $block = $(html);
    var $details = $(".full-start-new__details");
    if ($details.length) $details.after($block);
    else $(".full-start-new, .full-start").append($block);

    $block.find('[data-action="setup"]').on("hover:enter", function () {
      Lampa.Input.edit(
        {
          title: "Введи API Ключ Кинопоиска",
          value: "",
          free: true,
        },
        function (new_value) {
          if (new_value && new_value.trim()) {
            Lampa.Storage.set("kp_unofficial_token", new_value.trim());
            Lampa.Noty.show("Ключ сохранен! Перезагрузите страницу фильма.");
          }
          Lampa.Controller.toggle("content");
        }
      );
    });
  }

  function renderErrorBlock(message, movie) {
    injectStyles();
    var html = '<div class="kp-extended-block">';
    html += '<div class="kp-placeholder">';
    html += ' <div class="kp-placeholder__title">✨ Кинопоиск+</div>';
    html +=
      ' <div class="kp-placeholder__text">' + escapeHtml(message) + "</div>";
    html += "</div>";
    html += "</div>";

    var $block = $(html);
    var $details = $(".full-start-new__details");
    if ($details.length) $details.after($block);
    else $(".full-start-new, .full-start").append($block);
  }

  /* ========================================================================= 4. ВСПОМОГАТЕЛЬНЫЕ ========================================================================= */

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function showImageViewer(url) {
    $(".kp-image-viewer").remove();
    var $viewer = $(
      '<div class="kp-image-viewer selector"><img src="' +
        url +
        '" alt="" /></div>'
    );
    $("body").append($viewer);
    $viewer.on("hover:enter click", function () {
      $(this).remove();
      Lampa.Controller.toggle("content");
    });
    // Даём Lampa управлять этим элементом
    setTimeout(function () {
      try {
        Lampa.Controller.add("kp-viewer", {
          toggle: function () {},
          left: function () {},
          right: function () {},
          enter: function () {
            $viewer.remove();
            Lampa.Controller.toggle("content");
          },
          back: function () {
            $viewer.remove();
            Lampa.Controller.toggle("content");
          },
        });
        Lampa.Controller.toggle("kp-viewer");
      } catch (e) {}
    }, 50);
  }

  if (!window.free_kp_extended_ready) startPlugin();
})();
