(function () {
    "use strict";

    function startPlugin() {
        window.free_kp_extended_ready = true;

        if (!document.getElementById('kp-extended-css')) {
            var style = document.createElement('style');
            style.id = 'kp-extended-css';
            style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
            document.head.appendChild(style);
        }

        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            $(".button--kp-main-plus").remove();

            var btnHtml = '<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>';
            
            var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
            if (btnContainer.length) {
                btnContainer.append(btnHtml);
            }

            $(".button--kp-main-plus").on("hover:enter", function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');

                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                Lampa.Loading.start();

                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = ('' + e.data.movie.first_air_date).split('-')[0];

                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
                if (kpid) {
                    Lampa.Loading.stop();
                    openMenu(kpid, token, movieTitle, movieYear);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    // Используем современный высокоточный эндпоинт v2.2
                    fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films?keyword=' + searchQuery, {
                        method: 'GET',
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(searchJson) {
                        Lampa.Loading.stop();
                        var items = searchJson.items || searchJson.films || [];
                        if (items && items.length > 0) {
                            var bestMatch = items[0].kinopoiskId || items[0].filmId;
                            
                            // УМНАЯ СВЕРКА ГОДОВ (Допуск +-1 год для новинок вроде Обсессии)
                            if (movieYear) {
                                var targetYear = parseInt(movieYear, 10);
                                for (var f = 0; f < items.length; f++) {
                                    var kpYear = parseInt(items[f].year, 10);
                                    if (!isNaN(kpYear) && Math.abs(kpYear - targetYear) <= 1) {
                                        bestMatch = items[f].kinopoiskId || items[f].filmId;
                                        break;
                                    }
                                }
                            }
                            openMenu(bestMatch, token, movieTitle, movieYear);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    })
                    .catch(function() {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка поиска Кинопоиска.');
                    });
                }
            });
        });
    }

    function openMenu(kp_id, token, movieTitle, movieYear) {
        var items = [
            { title: '💡 Интересные факты', action: 'facts' },
            { title: '🚫 Киноляпы и ошибки', action: 'bloopers' },
            { title: '🏆 Награды и номинации', action: 'awards' },
            { title: '📸 Кадры со съемок', action: 'stills' },
            { title: '🖼 Официальные постеры', action: 'posters' },
            { title: '👥 Похожие фильмы', action: 'similars' },
            { title: '🔑 Сбросить / Изменить API Ключ', action: 'reset_key' }
        ];

        Lampa.Select.show({
            title: 'Материалы Кинопоиска',
            items: items,
            onSelect: function (item) {
                if (item.action === 'reset_key') {
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: Lampa.Storage.get('kp_unofficial_token', ''), free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    Lampa.Loading.start();
                    fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', {
                        method: 'GET',
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        Lampa.Loading.stop();
                        if (json && json.items && json.items.length > 0) {
                            var simItems = [];
                            for (var s = 0; s < json.items.length; s++) {
                                var sName = json.items[s].nameRu || json.items[s].nameOriginal;
                                simItems.push({ title: sName, query: sName });
                            }
                            Lampa.Select.show({
                                title: 'Похожие фильмы',
                                items: simItems,
                                onSelect: function(selectedSim) {
                                    // ИСПРАВЛЕНО: Закрываем все слои меню перед переходом к поиску
                                    Lampa.Select.close();
                                    Lampa.Modal.close();
                                    Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                                },
                                onBack: function() { openMenu(kp_id, token, movieTitle, movieYear); }
                            });
                        } else {
                            Lampa.Noty.show('Похожих фильмов не найдено.');
                            Lampa.Controller.toggle('content');
                        }
                    })
                    .catch(function() {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка загрузки похожих фильмов.');
                    });
                } else {
                    loadDataAndShow(kp_id, token, item.action, item.title, movieTitle, movieYear);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function loadDataAndShow(kp_id, token, action, menuTitle, movieTitle, movieYear) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        fetch('https://kinopoiskapiunofficial.tech/api/' + url, {
            method: 'GET',
            headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
        })
        .then(function(res) { return res.json(); })
        .then(function(json) {
            Lampa.Loading.stop();
            var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
            
            if (action === 'facts' || action === 'bloopers') {
                var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                var count = 0;
                if (json && json.items) {
                    for (var i = 0; i < json.items.length; i++) {
(function () {
    "use strict";

    var token = '';

    // Безопасная функция запросов к Кинопоиску
    function kpRequest(endpoint, cb) {
        token = Lampa.Storage.get('kp_unofficial_token', '');
        if (!token) {
            Lampa.Loading.stop();
            Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                if (new_value && new_value.trim()) {
                    Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                    Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                }
            });
            return;
        }

        fetch('https://kinopoiskapiunofficial.tech/api/' + endpoint, {
            method: 'GET',
            headers: {
                'X-API-KEY': token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Ошибка сети: ' + response.status);
            return response.json();
        })
        .then(function(json) {
            Lampa.Loading.stop();
            if (json) cb(json);
        })
        .catch(function(err) {
            Lampa.Loading.stop();
            Lampa.Noty.show('Ошибка Кинопоиска: ' + err.message);
        });
    }

    // Главное меню выбора материалов
    function showExtraMenu(kp_id, movieTitle, movieYear, isTvShow) {
        var items = [
            { title: '💡 Интересные факты', action: 'facts' },
            { title: '🚫 Киноляпы и ошибки', action: 'bloopers' },
            { title: '🏆 Награды и номинации', action: 'awards' },
            { title: '📸 Кадры со съемок', action: 'stills' },
            { title: '🖼 Официальные постеры', action: 'posters' },
            { title: '👥 Похожие фильмы', action: 'similars' },
            { title: '🔑 Сбросить / Изменить API Ключ', action: 'reset_key' }
        ];

        Lampa.Select.show({
            title: 'Материалы Кинопоиска',
            items: items,
            onSelect: function (item) {
                if (item.action === 'reset_key') {
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: Lampa.Storage.get('kp_unofficial_token', ''), free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    Lampa.Loading.start();
                    kpRequest('v2.2/films/' + kp_id + '/similars', function(json) {
                        if (json && json.items && json.items.length > 0) {
                            var simItems = [];
                            for (var s = 0; s < json.items.length; s++) {
                                var sName = json.items[s].nameRu || json.items[s].nameOriginal;
                                simItems.push({ title: sName, id: json.items[s].filmId });
                            }
                            Lampa.Select.show({
                                title: 'Похожие фильмы',
                                items: simItems,
                                onSelect: function(selectedSim) {
                                    Lampa.Select.close();
                                    Lampa.Modal.close();
                                    Lampa.Loading.start();
                                    
                                    // ИСПРАВЛЕНО: Вместо кривого поиска сразу загружаем карточку фильма по его IMDB ID!
                                    fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id, {
                                        method: 'GET',
                                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                                    })
                                    .then(function(r) { return r.json(); })
                                    .then(function(details) {
                                        Lampa.Loading.stop();
                                        if (details && details.imdbId) {
                                            var method = 'movie';
                                            if (details.type && (details.type.indexOf('SERIES') !== -1 || details.type.indexOf('SHOW') !== -1)) {
                                                method = 'tv';
                                            }
                                            Lampa.Activity.push({
                                                url: '',
                                                component: 'full',
                                                id: details.imdbId,
                                                method: method,
                                                source: 'imdb'
                                            });
                                        } else {
                                            // Если IMDB ID нет, делаем безопасный текстовый поиск с задержкой
                                            setTimeout(function() {
                                                Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                                            }, 150);
                                        }
                                    })
                                    .catch(function() {
                                        Lampa.Loading.stop();
                                        setTimeout(function() {
                                            Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                                        }, 150);
                                    });
                                },
                                onBack: function() { showExtraMenu(kp_id, movieTitle, movieYear, isTvShow); }
                            });
                        } else {
                            Lampa.Noty.show('Похожих фильмов не найдено.');
                            Lampa.Controller.toggle('content');
                        }
                    });
                } else {
                    showContentModal(kp_id, item.action, item.title, isTvShow, movieTitle, movieYear);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Всплывающее окно с контентом
    function showContentModal(kp_id, action, menuTitle, isTvShow, movieTitle, movieYear) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        kpRequest(url, function(json) {
            var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
            
            if (action === 'facts' || action === 'bloopers') {
                var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                var count = 0;
                if (json && json.items) {
                    for (var i = 0; i < json.items.length; i++) {
                        if (json.items[i].type === typeFilter) {
                            count++;
                            var cleanText = json.items[i].text.replace(/<[^>]+>/g, '');
                            var spoiler = json.items[i].spoiler ? '<span style="color:#ff5252; font-weight:bold; background:rgba(255,82,82,0.15); padding:2px 6px; border-radius:4px; margin-right:6px; display:inline-block;">СПОЙЛЕР</span>' : '';
                            html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + spoiler + cleanText + '</div>';
                        }
                    }
                }
                if (count === 0) html += '<div style="text-align:center; color:#aaa; padding:20px;">Ничего не найдено.</div>';
            }
            
            else if (action === 'awards') {
                if (json && json.items && json.items.length > 0) {
                    for (var j = 0; j < json.items.length; j++) {
                        var a = json.items[j];
                        var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                        html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa; font-size:0.95em;">' + a.nominationName + '</span></div>';
                    }
                } else html += '<div style="text-align:center; color:#aaa; padding:20px;">Наград не найдено.</div>';
            }
            
            else if (action === 'stills' || action === 'posters') {
                if (json && json.items && json.items.length > 0) {
                    html += '<div style="text-align:center;">';
                    var widthPercent = action === 'stills' ? '92%' : '45%';
                    for (var k = 0; k < json.items.length; k++) {
                        html += '<img src="' + json.items[k].previewUrl + '" style="width:' + widthPercent + '; margin:8px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);" />';
                    }
                    html += '</div>';
                } else html += '<div style="text-align:center; color:#aaa; padding:20px;">Изображений не найдено.</div>';
            }

            html += '</div>';

            Lampa.Modal.open({
                title: menuTitle,
                html: $(html),
                size: 'large',
                mask: true,
                onBack: function() {
                    Lampa.Modal.close();
                    openMenu(kp_id, token, movieTitle, movieYear);
                }
            });
        });
    }

    function startPlugin() {
        window.free_kp_extended_ready = true;

        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            $(".button--kp-main-plus").remove();

            var btnHtml = '<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>';
            
            var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
            if (btnContainer.length) {
                btnContainer.append(btnHtml);
            }

            $(".button--kp-main-plus").on("hover:enter", function () {
                token = Lampa.Storage.get('kp_unofficial_token', '');
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                Lampa.Loading.start();

                var isTvShow = !!e.data.movie.name;
                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = ('' + e.data.movie.first_air_date).split('-')[0];

                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
                if (kpid) {
                    Lampa.Loading.stop();
                    openMenu(kpid, token, movieTitle, movieYear);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    // ИСПРАВЛЕНО: Вернулись на v2.1, который идеально видит новые и невышедшие фильмы 2025-2026 годов
                    fetch('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, {
                        method: 'GET',
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(searchJson) {
                        Lampa.Loading.stop();
                        var items = searchJson.films || searchJson.items || [];
                        if (items && items.length > 0) {
                            // Резервный вариант: по умолчанию берем первый фильм из поиска
                            var bestMatch = items[0].filmId || items[0].kinopoiskId;
                            
                            // ИСПРАВЛЕНО: Мягкая сверка годов (+-1 год) для точного отсеивания однофамильцев
                            if (movieYear) {
                                var targetYear = parseInt(movieYear, 10);
                                for (var f = 0; f < items.length; f++) {
                                    var kpYear = parseInt(items[f].year, 10);
                                    if (!isNaN(kpYear) && Math.abs(kpYear - targetYear) <= 1) {
                                        bestMatch = items[f].filmId || items[f].kinopoiskId;
                                        break;
                                    }
                                }
                            }
                            openMenu(bestMatch, token, movieTitle, movieYear);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    })
                    .catch(function() {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка поиска.');
                    });
                }
            });
        });
    }

    if (!window.free_kp_extended_ready) startPlugin();
})();

-align:center;">';
                    var widthPercent = action === 'stills' ? '92%' : '45%';
                    for (var k = 0; k < json.items.length; k++) {
                        html += '<img src="' + json.items[k].previewUrl + '" style="width:' + widthPercent + '; margin:8px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);" />';
                    }
                    html += '</div>';
                } else html += '<div style="text-align:center; color:#aaa; padding:20px;">Изображений не найдено.</div>';
            }

            html += '</div>';

            Lampa.Modal.open({
                title: menuTitle,
                html: $(html),
                size: 'large',
                mask: true,
                onBack: function() {
                    Lampa.Modal.close();
                    openMenu(kp_id, token, movieTitle, movieYear);
                }
            });
        })
        .catch(function() {
            Lampa.Loading.stop();
            Lampa.Noty.show('Ошибка загрузки данных Кинопоиска.');
        });
    }

    if (!window.free_kp_extended_ready) startPlugin();
})();
