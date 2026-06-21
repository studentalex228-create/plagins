(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎬 СЛУШАТЕЛЬ КАРТОЧКИ ФИЛЬМА
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            
            // Защита от дублирования кнопки
            if (page.find('.button--kp-main-plus').length > 0) return;

            // Создаем красивую кнопку "Кинопоиск+" строго на странице фильма
            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on('hover:enter', function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');

                // 🔑 Шаг 1: Если ключа нет — запрашиваем ввод
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                // 🚀 Шаг 2: Если ключ есть — ищем фильм и открываем меню доп. материалов
                Lampa.Noty.show('Связываюсь с Кинопоиском...');
                
                var network = new Lampa.Reguest();
                var isTvShow = !!e.data.movie.name;
                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = e.data.movie.release_date.split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = e.data.movie.first_air_date.split('-')[0];

                function apiRequest(endpoint, successCall) {
                    network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, function() {
                        Lampa.Noty.show('Ошибка соединения с API Кинопоиска.');
                    }, false, {
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    });
                }

                // Главное меню выбора материалов
                function openExtraMenu(kp_id) {
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
                        title: 'Доп. материалы Кинопоиска',
                        items: items,
                        onSelect: function (item) {
                            if (item.action === 'reset_key') {
                                Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                                    if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                                    Lampa.Controller.toggle('content');
                                });
                            } else if (item.action === 'similars') {
                                // Похожие фильмы открываем списком
                                apiRequest('v2.2/films/' + kp_id + '/similars', function(simJson) {
                                    if (simJson && simJson.items && simJson.items.length > 0) {
                                        var simItems = [];
                                        for (var s = 0; j < simJson.items.length; s++) {
                                            var sName = simJson.items[s].nameRu || simJson.items[s].nameOriginal;
                                            simItems.push({ title: sName, query: sName });
                                        }
                                        Lampa.Select.show({
                                            title: 'Похожие фильмы',
                                            items: simItems,
                                            onSelect: function(selectedSim) {
                                                Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                                            },
                                            onBack: function() { openExtraMenu(kp_id); }
                                        });
                                    } else {
                                        Lampa.Noty.show('Похожих фильмов не найдено.');
                                        Lampa.Controller.toggle('content');
                                    }
                                });
(function () {
    "use strict";

    function startPlugin() {
        window.free_kp_extended_ready = true;

        // Внедряем стили спойлеров (Чистый нативный JS, не падает)
        if (!document.getElementById('kp-extended-css')) {
            var style = document.createElement('style');
            style.id = 'kp-extended-css';
            style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
            document.head.appendChild(style);
        }

        // 🎬 СЛУШАТЕЛЬ КАРТОЧКИ ФИЛЬМА (Идентично rezkacomment.js)
        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            
            // Защита от дублирования кнопки
            if (page.find('.button--kp-main-plus').length > 0) return;

            // Создаем красивую кнопку "Кинопоиск+" строго на странице фильма
            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on('hover:enter', function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');

                // 🔑 Если ключа нет — запрашиваем ввод прямо внутри фильма
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                // 🚀 Если ключ есть — запускаем логику
                Lampa.Loading.start();
                
                var network = new Lampa.Reguest();
                var isTvShow = !!e.data.movie.name;
                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = ('' + e.data.movie.first_air_date).split('-')[0];

                function apiRequest(endpoint, successCall) {
                    network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, function(json) {
                        Lampa.Loading.stop();
                        successCall(json);
                    }, function() {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка соединения с API Кинопоиска.');
                    }, false, {
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    });
                }

                // Главное меню выбора материалов
                function openExtraMenu(kp_id) {
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
                        title: 'Доп. материалы Кинопоиска',
                        items: items,
                        onSelect: function (item) {
                            if (item.action === 'reset_key') {
                                Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                                    if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                                    Lampa.Controller.toggle('content');
                                });
                            } else if (item.action === 'similars') {
                                Lampa.Loading.start();
                                apiRequest('v2.2/films/' + kp_id + '/similars', function(simJson) {
                                    if (simJson && simJson.items && simJson.items.length > 0) {
                                        var simItems = [];
                                        // ИСПРАВЛЕНО: Полностью починили цикл перебора похожих фильмов
                                        for (var s = 0; s < simJson.items.length; s++) {
                                            var sName = simJson.items[s].nameRu || simJson.items[s].nameOriginal;
                                            simItems.push({ title: sName, query: sName });
                                        }
                                        Lampa.Select.show({
                                            title: 'Похожие фильмы',
                                            items: simItems,
                                            onSelect: function(selectedSim) {
                                                Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                                            },
                                            onBack: function() { openExtraMenu(kp_id); }
                                        });
                                    } else {
                                        Lampa.Noty.show('Похожих фильмов не найдено.');
                                        Lampa.Controller.toggle('content');
                                    }
                                });
                            } else {
                                loadContentData(kp_id, item.action, item.title);
                            }
                        },
                        onBack: function () {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }

                function loadContentData(kp_id, action, menuTitle) {
                    var url = '';
                    if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
                    if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
                    if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
                    if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

                    Lampa.Loading.start();
                    apiRequest(url, function(json) {
                        var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
                        
                        if (action === 'facts' || action === 'bloopers') {
                            var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                            var count = 0;
                            for (var i = 0; i < json.items.length; i++) {
                                if (json.items[i].type === typeFilter) {
                                    count++;
                                    var cleanText = json.items[i].text.replace(/<[^>]+>/g, '');
                                    var spoiler = json.items[i].spoiler ? '<span class="kp-spoiler">СПОЙЛЕР</span>' : '';
                                    html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + spoiler + cleanText + '</div>';
                                }
                            }
                            if (count === 0) html += '<div style="text-align:center; color:#aaa; padding:20px;">Ничего не найдено.</div>';
                        }
                        
                        else if (action === 'awards') {
                            if (json.items && json.items.length > 0) {
                                for (var j = 0; j < json.items.length; j++) {
                                    var a = json.items[j];
                                    var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                                    html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa; font-size:0.95em;">' + a.nominationName + '</span></div>';
                                }
                            } else html += '<div style="text-align:center; color:#aaa; padding:20px;">Наград не найдено.</div>';
                        }
                        
                        else if (action === 'stills' || action === 'posters') {
                            if (json.items && json.items.length > 0) {
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
                                openExtraMenu(kp_id);
                            }
                        });
                    });
                }

                // Умный поиск ID фильма со сверкой годов выпуска
                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
                if (kpid) {
                    openExtraMenu(kpid);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    network.silent('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, function(searchJson) {
                        Lampa.Loading.stop();
                        if (searchJson && searchJson.films && searchJson.films.length > 0) {
                            var bestMatch = searchJson.films[0].filmId;
                            if (movieYear) {
                                for (var f = 0; f < searchJson.films.length; f++) {
                                    var fYear = '' + searchJson.films[f].year;
                                    if (fYear && fYear.indexOf(movieYear) !== -1) {
                                        bestMatch = searchJson.films[f].filmId;
                                        break;
                                    }
                                }
                            }
                            openExtraMenu(bestMatch);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    }, function() {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка поиска.');
                    }, false, { headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' } });
                }
            });

            var btnContainer = page.find('.full-start-new__buttons');
            if (!btnContainer.length) btnContainer = page.find('.full-start__buttons');
            if (btnContainer.length) btnContainer.append(btn);
        });
    }

    if (!window.free_kp_extended_ready) startPlugin();
})();

                            } else {
                                // Текстовые факты, ляпы, награды и картинки
                                loadContentData(kp_id, item.action, item.title);
                            }
                        },
                        onBack: function () {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }

                function loadContentData(kp_id, action, menuTitle) {
                    var url = '';
                    if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
                    if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎬 СЛУШАТЕЛЬ КАРТОЧКИ ФИЛЬМА
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            
            // Защита от дублирования кнопки
            if (page.find('.button--kp-main-plus').length > 0) return;

            // Создаем красивую кнопку "Кинопоиск+" строго на странице фильма
            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on('hover:enter', function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');

                // 🔑 Если ключа нет — запрашиваем ввод
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                // 🚀 Если ключ есть — запускаем логику
                Lampa.Noty.show('Связываюсь с Кинопоиском...');
                
                var network = new Lampa.Reguest();
                var isTvShow = !!e.data.movie.name;
                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = ('' + e.data.movie.first_air_date).split('-')[0];

                function apiRequest(endpoint, successCall) {
                    network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, function() {
                        Lampa.Noty.show('Ошибка соединения с API Кинопоиска.');
                    }, false, {
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    });
                }

                // Главное меню выбора материалов
                function openExtraMenu(kp_id) {
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
                        title: 'Доп. материалы Кинопоиска',
                        items: items,
                        onSelect: function (item) {
                            if (item.action === 'reset_key') {
                                Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                                    if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                                    Lampa.Controller.toggle('content');
                                });
                            } else if (item.action === 'similars') {
                                apiRequest('v2.2/films/' + kp_id + '/similars', function(simJson) {
                                    if (simJson && simJson.items && simJson.items.length > 0) {
                                        var simItems = [];
                                        // ИСПРАВЛЕНО: Заменили ошибочный j на s, вылета больше не будет
                                        for (var s = 0; s < simJson.items.length; s++) {
                                            var sName = simJson.items[s].nameRu || simJson.items[s].nameOriginal;
                                            simItems.push({ title: sName, query: sName });
                                        }
                                        Lampa.Select.show({
                                            title: 'Похожие фильмы',
                                            items: simItems,
                                            onSelect: function(selectedSim) {
                                                Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                                            },
                                            onBack: function() { openExtraMenu(kp_id); }
                                        });
                                    } else {
                                        Lampa.Noty.show('Похожих фильмов не найдено.');
                                        Lampa.Controller.toggle('content');
                                    }
                                });
                            } else {
                                loadContentData(kp_id, item.action, item.title);
                            }
                        },
                        onBack: function () {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }

                function loadContentData(kp_id, action, menuTitle) {
                    var url = '';
                    if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
                    if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎨 ВНЕДРЕНИЕ ПРЕМИУМ-ДИЗАЙНА (Абсолютно безопасный метод без jQuery на старте)
        if (!document.getElementById('kp-extended-css')) {
            var style = document.createElement('style');
            style.id = 'kp-extended-css';
            style.innerHTML = '.kp-slogan { font-style: italic; color: #a9a9a9; margin-bottom: 12px; font-size: 1.15em; border-left: 3px solid #f60; padding-left: 10px; } .kp-review-card { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); display: inline-block; vertical-align: top; width: 300px; margin-right: 15px; white-space: normal; } .kp-spoiler { color: #ff5252; font-weight: 700; font-size: 0.85em; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; } .kp-image-card { border-radius: 12px; overflow: hidden; height: 180px; width: 320px; display: inline-block; margin-right: 15px; background-size: cover; background-position: center; cursor: pointer; } .kp-similar-card { width: 130px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer; } .kp-similar-poster { width: 130px; height: 195px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3); } .kp-similar-title { margin-top: 8px; font-size: 0.85em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #eee; white-space: normal; } .kp-modal-text { font-size: 1.1em; line-height: 1.5; color: #ddd; text-align: left; } .kp-modal-text hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0; }';
            document.head.appendChild(style);
        }

        // 🎬 СЛУШАТЕЛЯ КАРТОЧКИ ФИЛЬМА
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            var token = Lampa.Storage.get('kp_unofficial_token', '');

            // 🔑 ЕСЛИ КЛЮЧА НЕТ — Показываем кнопку ввода прямо в карточке!
            if (!token) {
                if (page.find('.button--kp-token').length === 0) {
                    var btn = $('<div class="full-start__button selector button--kp-token" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">🔑 Ключ Кинопоиска</span></div>');
                    btn.on('hover:enter', function () {
                        Lampa.Input.edit({ title: 'Введи API Ключ', value: '', free: true }, function (new_value) {
                            if (new_value && new_value.trim()) {
                                Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                                btn.remove();
                                Lampa.Noty.show('Ключ успешно сохранен! Перезайдите в этот фильм.');
                            }
                        });
                    });
                    var btnContainer = page.find('.full-start-new__buttons');
                    if (!btnContainer.length) btnContainer = page.find('.full-start__buttons');
                    if (btnContainer.length) btnContainer.append(btn);
                }
                return;
            }

            // 🚀 ЕСЛИ КЛЮЧ ЕСТЬ — Запускаем безопасную загрузку
            var network = new Lampa.Reguest();
            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
            var movieYear = '';
            if (e.data.movie.release_date) movieYear = e.data.movie.release_date.split('-')[0];
            else if (e.data.movie.first_air_date) movieYear = e.data.movie.first_air_date.split('-')[0];

            Lampa.Noty.show('Ищу «' + movieTitle + '» на Кинопоиске...');

            function apiRequest(endpoint, successCall) {
                network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, function() {}, false, {
                    headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                });
            }

            function createSection(id, title) {
                if (page.find('.' + id).length > 0) return;
                var html = '<div class="items-line layer--visible layer--render ' + id + '">' +
                            '<div class="items-line__head"><div class="items-line__title">' + title + '</div></div>' +
                            '<div class="items-line__body">' +
                                '<div class="scroll scroll--horizontal">' +
                                    '<div class="scroll__content"><div class="scroll__body full-reviews ' + id + '-items" style="padding-top:10px; padding-bottom:15px; white-space: nowrap;"></div></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
                var target = page.find('.items-line').last();
                if (target.length) target.after(html);
                else page.find('.full-start-new__details, .full-start__details').append(html);
            }

            function loadMainInfo(kp_id) {
                apiRequest('v2.2/films/' + kp_id, function(json) {
                    if (json && json.slogan && json.slogan !== '-' && page.find('.kp-slogan').length === 0) {
                        var sloganHtml = '<div class="kp-slogan">&laquo;' + json.slogan + '&raquo;</div>';
                        var desc = page.find('.full-start-new__description, .full-start__description');
                        if (desc.length) desc.before(sloganHtml);
                        else page.find('.full-start-new__details').append(sloganHtml);
                    }
                });
            }

            function loadSimilars(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/similars', function(json) {
                    if (json && json.items && json.items.length) {
                        page.find('.items-line__title').filter(function() {
                            var t = $(this).text().toLowerCase();
                            return t.indexOf('рекомендуем') !== -1 || t.indexOf('похожи') !== -1 || t.indexOf('связанн') !== -1;
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        var itemsBlock = page.find('.kp-similars-items');
                        
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var sim = json.items[i];
                                var name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                                var poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                                var item = $('<div class="selector layer--visible kp-similar-card">' +
                                                '<img src="' + poster + '" class="kp-similar-poster" />' +
                                                '<div class="kp-similar-title">' + name + '</div>' +
                                            '</div>');
                                
                                item.on('hover:enter', function() {
                                    Lampa.Noty.show('Загрузка...');
                                    apiRequest('v2.2/films/' + sim.filmId, function(details) {
                                        if (details && details.imdbId) {
                                            Lampa.Activity.push({ url: '', component: 'full', id: details.imdbId, method: isTvShow ? 'tv' : 'movie', source: 'imdb' });
                                        } else {
                                            Lampa.Activity.push({ component: 'search', query: name });
                                        }
                                    });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                    }
                });
            }

            function loadFactsAndBloopers(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/facts', function(json) {
                    if (json && json.items && json.items.length) {
                        var facts = [];
                        var bloopers = [];
                        for (var i = 0; i < json.items.length; i++) {
                            if (json.items[i].type === 'FACT') facts.push(json.items[i]);
                            if (json.items[i].type === 'BLOOPER') bloopers.push(json.items[i]);
                        }

                        function renderBlocks(dataList, containerClass, title, modalTitle) {
                            if (!dataList.length) return;
                            createSection(containerClass, title);
                            var itemsBlock = page.find('.' + containerClass + '-items');
                            
                            var fullTextHtml = '';
                            for (var j = 0; j < dataList.length; j++) {
                                var clean = dataList[j].text.replace(/<[^>]+>/g, '');
                                var spoiler = dataList[j].spoiler ? '<span class="kp-spoiler">[СПОЙЛЕР]</span>' : '';
                                fullTextHtml += spoiler + clean + '<br><hr>';
                            }

                            for (var k = 0; k < dataList.length; k++) {
                                (function () {
                                    var clean = dataList[k].text.replace(/<[^>]+>/g, '');
                                    var spoiler = dataList[k].spoiler ? '<span class="kp-spoiler">СПОЙЛЕР</span>' : '';
                                    var preview = clean.length > 150 ? clean.substring(0, 150) + '...' : clean;
                                    
                                    var item = $('<div class="selector layer--visible kp-review-card">' +
                                                    '<div style="font-size: 0.95em; line-height: 1.4; white-space: normal;">' + spoiler + preview + '</div>' +
                                                '</div>');
                                    
                                    item.on('hover:enter', function() {
                                        Lampa.Modal.open({
                                            title: modalTitle,
                                            html: $('<div class="broadcast__text kp-modal-text"><div>' + fullTextHtml + '</div></div>'),
                                            size: "large", mask: true, onBack: function() { Lampa.Modal.close(); }
                                        });
                                    });
                                    itemsBlock.append(item);
                                })();
                            }
                        }

                        renderBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        renderBlocks(bloopers, 'kp-bloopers', 'Ошибки в ' + (isTvShow ? 'сериале' : 'фильме'), 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/awards', function(json) {
                    if (json && json.items && json.items.length) {
                        createSection('kp-awards', 'Награды');
                        var itemsBlock = page.find('.kp-awards-items');
                        for (var i = 0; i < json.items.length; i++) {
                            var a = json.items[i];
                            var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($('<div class="selector layer--visible kp-review-card" style="min-width: 240px;">' +
                                    '<div style="line-height: 1.4; white-space: normal;">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa; font-size: 0.9em;">' + a.nominationName + '</span></div>' +
                                '</div>'));
                        }
                    }
                });
            }

            function loadImages(kp_id, type, title, containerClass) {
                apiRequest('v2.2/films/' + kp_id + '/images?type=' + type + '&page=1', function(json) {
                    if (json && json.items && json.items.length) {
                        createSection(containerClass, title);
                        var itemsBlock = page.find('.' + containerClass + '-items');
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var img = json.items[i];
                                var item = $('<div class="selector layer--visible kp-image-card" style="background-image: url(\'' + img.previewUrl + '\');"></div>');
                                item.on('hover:enter', function() {
                                    Lampa.Modal.open({ 
                                        title: title, 
                                        html: $('<div style="text-align:center; padding: 20px;"><img src="' + img.imageUrl + '" style="max-width:100%; max-height:80vh; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7);"></div>'), 
                                        size: "large", mask: true, onBack: function() { Lampa.Modal.close(); } 
                                    });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                    }
                });
            }

            function startFetching(kp_id) {
                loadMainInfo(kp_id);
                loadFactsAndBloopers(kp_id);
                loadSimilars(kp_id);
                loadAwards(kp_id);
                loadImages(kp_id, 'STILL', 'Кадры', 'kp-stills');
                loadImages(kp_id, 'POSTER', 'Постеры', 'kp-posters');
            }

            var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
            if (kpid) {
                startFetching(kpid);
            } else {
                var query = encodeURIComponent(movieTitle + (movieYear ? ' ' + movieYear : ''));
                apiRequest('v2.1/films/search-by-keyword?keyword=' + query, function(searchJson) {
                    if (searchJson && searchJson.films && searchJson.films.length) {
                        startFetching(searchJson.films[0].filmId);
                    }
                });
            }
        });
    }

    if (window.Lampa) startPlugin();
    else if (window.LampaListener) window.LampaListener.follow("app", function(e) { if (e.type === "ready") startPlugin(); });
})();

                    if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
                    if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

                    apiRequest(url, function(json) {
                        var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
                        
                        if (action === 'facts' || action === 'bloopers') {
                            var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                            var count = 0;
                            for (var i = 0; i < json.items.length; i++) {
                                if (json.items[i].type === typeFilter) {
                                    count++;
                                    var cleanText = json.items[i].text.replace(/<[^>]+>/g, '');
                                    var spoiler = json.items[i].spoiler ? '<span style="color:#ff5252; font-weight:bold; background:rgba(255,82,82,0.15); padding:2px 6px; border-radius:4px; margin-right:6px;">СПОЙЛЕР</span>' : '';
                                    html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + spoiler + cleanText + '</div>';
                                }
                            }
                            if (count === 0) html += '<div style="text-align:center; color:#aaa; padding:20px;">Ничего не найдено.</div>';
                        }
                        
                        else if (action === 'awards') {
                            if (json.items && json.items.length > 0) {
                                for (var j = 0; j < json.items.length; j++) {
                                    var a = json.items[j];
(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎨 ВНЕДРЕНИЕ ПРЕМИУМ-ДИЗАЙНА (Чистый JS без сбоев)
        if (!document.getElementById('kp-extended-css')) {
            var style = document.createElement('style');
            style.id = 'kp-extended-css';
            style.innerHTML = '' +
                '.kp-slogan { font-style: italic; color: #a9a9a9; margin-bottom: 12px; font-size: 1.15em; border-left: 3px solid #f60; padding-left: 10px; } ' +
                '.kp-review-card { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s, box-shadow 0.2s; height: 100%; display: flex; align-items: center; } ' +
                '.kp-review-card.focus { transform: scale(1.02); box-shadow: 0 0 0 2px #fff; background: rgba(255,255,255,0.15); } ' +
                '.kp-spoiler { color: #ff5252; font-weight: 700; font-size: 0.85em; text-transform: uppercase; margin-right: 6px; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; } ' +
                '.kp-image-card { border-radius: 12px; overflow: hidden; height: 180px; width: 320px; position: relative; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.2s; } ' +
                '.kp-image-card.focus { transform: scale(1.03); box-shadow: 0 0 0 3px #fff; } ' +
                '.kp-similar-wrap { width: 130px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer; } ' +
                '.kp-similar-poster { width: 130px; height: 195px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s; } ' +
                '.kp-similar-wrap.focus .kp-similar-poster { transform: scale(1.05); box-shadow: 0 0 0 3px #fff; } ' +
                '.kp-similar-title { margin-top: 8px; font-size: 0.85em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #eee; } ' +
                '.kp-modal-text { font-size: 1.1em; line-height: 1.5; color: #ddd; } ' +
                '.kp-modal-text hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0; }';
            document.head.appendChild(style);
        }

        // ⚙️ БЕЗОПАСНЫЕ НАСТРОЙКИ (Только стандартные тумблеры, чтобы Lampa не падала)
        Lampa.SettingsApi.addComponent({
            component: 'free_kp_ext',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>',
            name: 'Кинопоиск (API)'
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_title_1', type: 'title' }, field: { name: 'Настройки отображения' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_slogan', type: 'trigger', default: true }, field: { name: 'Показывать слоган' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_similars', type: 'trigger', default: true }, field: { name: 'Похожие фильмы' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_facts', type: 'trigger', default: true }, field: { name: 'Интересные факты' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_bloopers', type: 'trigger', default: true }, field: { name: 'Ошибки (киноляпы)' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_awards', type: 'trigger', default: true }, field: { name: 'Награды' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_stills', type: 'trigger', default: true }, field: { name: 'Кадры' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_ext', param: { name: 'kp_show_posters', type: 'trigger', default: true }, field: { name: 'Постеры' } });
        
        Lampa.SettingsApi.addParam({
            component: 'free_kp_ext',
            param: { name: 'kp_reset_token', type: 'trigger', default: false },
            field: { name: 'Удалить текущий API Ключ', description: 'Сброс ключа. Ввести новый можно будет на карточке любого фильма.' },
            onChange: function (val) {
                if (val) {
                    Lampa.Storage.set('kp_unofficial_token', '');
                    Lampa.Storage.set('kp_reset_token', false);
                    Lampa.Noty.show('Ключ удален! Откройте любой фильм.');
                }
            }
        });

        // 🎬 ОСНОВНАЯ ЛОГИКА И ИНТЕРФЕЙС
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            var token = Lampa.Storage.get('kp_unofficial_token', '');

            // 🔑 ЕСЛИ КЛЮЧА НЕТ: Выводим кнопку прямо в карточке фильма!
            if (!token) {
                if (page.find('.button--kp-token').length === 0) {
                    var btnHtml = '<div class="full-start__button selector button--kp-token" style="background: rgba(255,102,0,0.15); border: 1px solid #f60;">' +
                                  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>' +
                                  '<span style="color:#f60; font-weight:bold;">Ключ Кинопоиска</span></div>';
                    var btn = $(btnHtml);
                    
                    btn.on('hover:enter', function () {
                        Lampa.Input.edit({ title: 'Введите ключ API', value: '', free: true }, function (new_value) {
                            if (new_value && new_value.trim()) {
                                Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                                btn.remove();
                                Lampa.Noty.show('Ключ сохранен! Перезайдите в фильм.');
                            }
                        });
                    });

                    var btnContainer = page.find('.full-start-new__buttons');
                    if (!btnContainer.length) btnContainer = page.find('.full-start__buttons');
                    if (btnContainer.length) btnContainer.append(btn);
                }
                return; // Останавливаем выполнение, ждем пока введут ключ
            }

            // 🚀 ЕСЛИ КЛЮЧ ЕСТЬ: Загружаем данные
            var network = new Lampa.Reguest();
            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
            var movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];

            function apiRequest(endpoint, successCall) {
                network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, function() {}, false, {
                    headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                });
            }

            function createSection(id, title) {
                if (page.find('.' + id).length > 0) return;
                var html = '<div class="items-line layer--visible layer--render ' + id + '">' +
                            '<div class="items-line__head"><div class="items-line__title">' + title + '</div></div>' +
                            '<div class="items-line__body">' +
                                '<div class="scroll scroll--horizontal">' +
                                    '<div class="scroll__content"><div class="scroll__body full-reviews ' + id + '-items" style="padding-top:10px; padding-bottom:15px;"></div></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
                
                var target = page.find('.items-line').last();
                if (target.length) target.after(html);
                else page.find('.full-start-new__details, .full-start__details').append(html);
            }

            function loadMainInfo(kp_id) {
                apiRequest('v2.2/films/' + kp_id, function(json) {
                    if (json && json.slogan && json.slogan !== '-' && page.find('.kp-slogan').length === 0) {
                        var sloganHtml = '<div class="kp-slogan">&laquo;' + json.slogan + '&raquo;</div>';
                        var desc = page.find('.full-start-new__description, .full-start__description');
                        if (desc.length) desc.before(sloganHtml);
                        else page.find('.full-start-new__details').append(sloganHtml);
                    }
                });
            }

            function loadSimilars(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/similars', function(json) {
                    if (json && json.items && json.items.length) {
                        page.find('.items-line__title').filter(function() {
                            var t = $(this).text().toLowerCase();
                            return t.indexOf('рекомендуем') !== -1 || t.indexOf('похожи') !== -1 || t.indexOf('связанн') !== -1;
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        var itemsBlock = page.find('.kp-similars-items');
                        
                        json.items.forEach(function(sim) {
                            var name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                            var poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                            var item = $('<div class="selector layer--visible kp-similar-wrap">' +
                                            '<img src="' + poster + '" class="kp-similar-poster" />' +
                                            '<div class="kp-similar-title">' + name + '</div>' +
                                        '</div>');
                            
                            item.on('hover:enter', function() {
                                Lampa.Noty.show('Загрузка карточки...');
                                apiRequest('v2.2/films/' + sim.filmId, function(details) {
                                    if (details && details.imdbId) {
                                        Lampa.Activity.push({ url: '', component: 'full', id: details.imdbId, method: isTvShow ? 'tv' : 'movie', source: 'imdb' });
                                    } else {
                                        Lampa.Activity.push({ component: 'search', query: name });
                                    }
                                });
                            });
                            itemsBlock.append(item);
                        });
                    }
                });
            }

            function loadFactsAndBloopers(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/facts', function(json) {
                    if (json && json.items && json.items.length) {
                        var facts = [];
                        var bloopers = [];
(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎬 СЛУШАТЕЛЬ КАРТОЧКИ ФИЛЬМА
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            
            // Защита от дублирования кнопки
            if (page.find('.button--kp-main-plus').length > 0) return;

            // Создаем красивую кнопку "Кинопоиск+" строго на странице фильма
            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on('hover:enter', function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');

                // 🔑 Шаг 1: Если ключа нет — запрашиваем ввод
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_value) {
                        if (new_value && new_value.trim()) {
                            Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                            Lampa.Noty.show('Ключ сохранен! Нажмите кнопку еще раз.');
                        }
                    });
                    return;
                }

                // 🚀 Шаг 2: Если ключ есть — ищем фильм и открываем меню доп. материалов
                Lampa.Noty.show('Связываюсь с Кинопоиском...');
                
                var network = new Lampa.Reguest();
                var isTvShow = !!e.data.movie.name;
                var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var movieYear = '';
                if (e.data.movie.release_date) movieYear = e.data.movie.release_date.split('-')[0];
                else if (e.data.movie.first_air_date) movieYear = e.data.movie.first_air_date.split('-')[0];

                function apiRequest(endpoint, successCall) {
                    network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, function() {
                        Lampa.Noty.show('Ошибка соединения с API Кинопоиска.');
                    }, false, {
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    });
                }

                // Главное меню выбора материалов
                function openExtraMenu(kp_id) {
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
                        title: 'Доп. материалы Кинопоиска',
                        items: items,
                        onSelect: function (item) {
                            if (item.action === 'reset_key') {
                                Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                                    if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                                    Lampa.Controller.toggle('content');
                                });
                            } else if (item.action === 'similars') {
                                // Похожие фильмы открываем списком
                                apiRequest('v2.2/films/' + kp_id + '/similars', function(simJson) {
                                    if (simJson && simJson.items && simJson.items.length > 0) {
                                        var simItems = [];
                                        for (var s = 0; j < simJson.items.length; s++) {
                                            var sName = simJson.items[s].nameRu || simJson.items[s].nameOriginal;
                                            simItems.push({ title: sName, query: sName });
                                        }
                                        Lampa.Select.show({
                                            title: 'Похожие фильмы',
                                            items: simItems,
                                            onSelect: function(selectedSim) {
                                                Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                                            },
                                            onBack: function() { openExtraMenu(kp_id); }
                                        });
                                    } else {
                                        Lampa.Noty.show('Похожих фильмов не найдено.');
                                        Lampa.Controller.toggle('content');
                                    }
                                });
                            } else {
                                // Текстовые факты, ляпы, награды и картинки
                                loadContentData(kp_id, item.action, item.title);
                            }
                        },
                        onBack: function () {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }

                function loadContentData(kp_id, action, menuTitle) {
                    var url = '';
                    if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
                    if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
                    if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
                    if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

                    apiRequest(url, function(json) {
                        var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
                        
                        if (action === 'facts' || action === 'bloopers') {
                            var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                            var count = 0;
                            for (var i = 0; i < json.items.length; i++) {
                                if (json.items[i].type === typeFilter) {
                                    count++;
                                    var cleanText = json.items[i].text.replace(/<[^>]+>/g, '');
                                    var spoiler = json.items[i].spoiler ? '<span style="color:#ff5252; font-weight:bold; background:rgba(255,82,82,0.15); padding:2px 6px; border-radius:4px; margin-right:6px;">СПОЙЛЕР</span>' : '';
                                    html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + spoiler + cleanText + '</div>';
                                }
                            }
                            if (count === 0) html += '<div style="text-align:center; color:#aaa; padding:20px;">Ничего не найдено.</div>';
                        }
                        
                        else if (action === 'awards') {
                            if (json.items && json.items.length > 0) {
                                for (var j = 0; j < json.items.length; j++) {
                                    var a = json.items[j];
                                    var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                                    html += '<div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa; font-size:0.95em;">' + a.nominationName + '</span></div>';
                                }
                            } else html += '<div style="text-align:center; color:#aaa; padding:20px;">Наград не найдено.</div>';
                        }
                        
                        else if (action === 'stills' || action === 'posters') {
                            if (json.items && json.items.length > 0) {
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
                                openExtraMenu(kp_id);
                            }
                        });
                    });
                }

                // Поиск ID фильма
                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
                if (kpid) {
                    openExtraMenu(kpid);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle + (movieYear ? ' ' + movieYear : ''));
                    network.silent('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, function(searchJson) {
                        if (searchJson && searchJson.films && searchJson.films.length > 0) {
                            openExtraMenu(searchJson.films[0].filmId);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    }, function() {
                        Lampa.Noty.show('Ошибка поиска. Проверьте API ключ.');
                    }, false, { headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' } });
                }
            });

            // Вставляем кнопку в карточку фильма
            var btnContainer = page.find('.full-start-new__buttons');
            if (!btnContainer.length) btnContainer = page.find('.full-start__buttons');
            if (btnContainer.length) btnContainer.append(btn);
        });
    }

    if (window.Lampa) startPlugin();
    else if (window.LampaListener) window.LampaListener.follow('app', function(e) { if (e.type === 'ready') startPlugin(); });
})();

                        json.items.forEach(function(f) {
                            if (f.type === 'FACT') facts.push(f);
                            if (f.type === 'BLOOPER') bloopers.push(f);
                        });

                        function renderBlocks(dataList, containerClass, title, modalTitle) {
                            if (!dataList.length) return;
                            createSection(containerClass, title);
                            var itemsBlock = page.find('.' + containerClass + '-items');
                            
                            var fullTextHtml = '';
                            dataList.forEach(function(f) {
                                var clean = f.text.replace(/<[^>]+>/g, '');
                                var spoiler = f.spoiler ? '<span class="kp-spoiler">[СПОЙЛЕР]</span>' : '';
                                fullTextHtml += spoiler + clean + '<br><hr>';
                            });

                            dataList.forEach(function(f) {
                                var clean = f.text.replace(/<[^>]+>/g, '');
                                var spoiler = f.spoiler ? '<span class="kp-spoiler">СПОЙЛЕР</span>' : '';
                                var preview = clean.length > 180 ? clean.substring(0, 180) + '...' : clean;
                                
                                var item = $('<div class="full-review selector layer--visible type--line kp-review-card" style="width: 350px; margin-right: 15px;">' +
                                                '<div class="full-review__text" style="font-size: 0.95em; line-height: 1.4;">' + spoiler + preview + '</div>' +
                                            '</div>');
                                
                                item.on('hover:enter', function() {
                                    Lampa.Modal.open({
                                        title: modalTitle,
                                        html: $('<div class="broadcast__text kp-modal-text"><div class="otzyv">' + fullTextHtml + '</div></div>'),
                                        size: "large", mask: true, onBack: function() { Lampa.Modal.close(); }
                                    });
                                });
                                itemsBlock.append(item);
                            });
                        }

                        if (Lampa.Storage.get('kp_show_facts', true)) renderBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        if (Lampa.Storage.get('kp_show_bloopers', true)) renderBlocks(bloopers, 'kp-bloopers', 'Ошибки ' + (isTvShow ? 'в сериале' : 'в фильме'), 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                apiRequest('v2.2/films/' + kp_id + '/awards', function(json) {
                    if (json && json.items && json.items.length) {
                        createSection('kp-awards', 'Награды');
                        var itemsBlock = page.find('.kp-awards-items');
                        json.items.forEach(function(a) {
                            var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($('<div class="full-review selector layer--visible type--line kp-review-card" style="min-width: 240px; margin-right: 15px;">' +
                                    '<div class="full-review__text" style="line-height: 1.4;">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa; font-size: 0.9em;">' + a.nominationName + '</span></div>' +
                                '</div>'));
                        });
                    }
                });
            }

            function loadImages(kp_id, type, title, containerClass) {
                apiRequest('v2.2/films/' + kp_id + '/images?type=' + type + '&page=1', function(json) {
                    if (json && json.items && json.items.length) {
                        createSection(containerClass, title);
                        var itemsBlock = page.find('.' + containerClass + '-items');
                        json.items.forEach(function(img) {
                            var item = $('<div class="selector layer--visible kp-image-card" style="margin-right: 15px; background: url(\'' + img.previewUrl + '\') center/cover no-repeat;"></div>');
                            item.on('hover:enter', function() {
                                Lampa.Modal.open({ 
                                    title: title, 
                                    html: $('<div style="text-align:center; padding: 20px;"><img src="' + img.imageUrl + '" style="max-width:100%; max-height:80vh; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7);"></div>'), 
                                    size: "large", mask: true, onBack: function() { Lampa.Modal.close(); } 
                                });
                            });
                            itemsBlock.append(item);
                        });
                    }
                });
            }
