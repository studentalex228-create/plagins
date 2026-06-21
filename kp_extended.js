(function () {
    "use strict";

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
                var movieYear = ('' + (e.data.movie.release_date || e.data.movie.first_air_date || '')).split('-')[0];
                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;

                if (kpid) {
                    Lampa.Loading.stop();
                    openMenu(kpid, token, movieTitle, movieYear);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    fetch('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, {
                        method: 'GET',
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(searchJson) {
                        Lampa.Loading.stop();
                        if (searchJson && searchJson.films && searchJson.films.length > 0) {
                            // ИСПРАВЛЕНИЕ 1: Умная сверка года
                            var bestMatch = searchJson.films[0].filmId;
                            if (movieYear) {
                                var target = parseInt(movieYear, 10);
                                for (var f = 0; f < searchJson.films.length; f++) {
                                    var fYear = parseInt(searchJson.films[f].year, 10);
                                    if (!isNaN(fYear) && Math.abs(fYear - target) <= 1) {
                                        bestMatch = searchJson.films[f].filmId;
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
                                simItems.push({ title: sName, id: json.items[s].filmId });
                            }
                            Lampa.Select.show({
                                title: 'Похожие фильмы',
                                items: simItems,
                                onSelect: function(selectedSim) {
                                    // ИСПРАВЛЕНИЕ 2: Прямой переход на карточку фильма
                                    Lampa.Select.close();
                                    Lampa.Modal.close();
                                    Lampa.Activity.push({
                                        url: '',
                                        component: 'full',
                                        id: selectedSim.id,
                                        method: 'movie',
                                        source: 'kp' // Используем провайдер Кинопоиска в Lampa
                                    });
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
                        Lampa.Noty.show('Ошибка.');
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
        var btnHtml = '<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>';
        
        var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
        if (btnContainer.length) {
            btnContainer.append(btnHtml);
        }

        // Логика нажатия на кнопку
        $(".button--kp-main-plus").on("hover:enter", function () {
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

            // 🚀 Если ключ есть — запускаем поиск фильма
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
                // Точный поиск без указания года в строке (чтобы избежать ошибок разницы баз)
                var searchQuery = encodeURIComponent(movieTitle);
                fetch('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, {
                    method: 'GET',
                    headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                })
                .then(function(res) { return res.json(); })
                .then(function(searchJson) {
                    Lampa.Loading.stop();
                    if (searchJson && searchJson.films && searchJson.films.length > 0) {
                        var bestMatch = searchJson.films[0].filmId;
                        // Умная сверка годов для точного сопоставления новинок
                        if (movieYear) {
                            for (var f = 0; f < searchJson.films.length; f++) {
                                var fYear = '' + searchJson.films[f].year;
                                if (fYear && fYear.indexOf(movieYear) !== -1) {
                                    bestMatch = searchJson.films[f].filmId;
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

// Главное меню выбора материалов
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
                                Lampa.Activity.push({ component: 'search', query: selectedSim.query });
                            },
                            onBack: function() { openMenu(kp_id, token, movieTitle, movieYear); }
                        });
                    } else {
                        Lampa.Noty.show('Похожих фильмов не найдено.');
                        Lampa.Controller.toggle('content');
                    }
                })
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

        // 🎬 СЛУШАТЕЛЬ КАРТОЧКИ ФИЛЬМА
        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            $(".button--kp-main-plus").remove();

            var btnHtml = '<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>';
            
            var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
            if (btnContainer.length) {
                btnContainer.append(btnHtml);
            }

            $(".button--kp-main-plus").off("hover:enter").on("hover:enter", function () {
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

                var isTvShow = !!e.data.movie.name;
                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;

                if (kpid) {
                    Lampa.Loading.stop();
                    openMenu(kpid, token, movieTitle, movieYear, isTvShow);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    var cleanUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery;
                    var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(cleanUrl);

                    fetch(proxyUrl, {
                        method: 'GET',
                        headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(searchJson) {
                        Lampa.Loading.stop();
                        var items = searchJson.films || searchJson.items || [];
                        if (items && items.length > 0) {
                            var bestMatch = items[0].filmId || items[0].kinopoiskId;
                            
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
                            openMenu(bestMatch, token, movieTitle, movieYear, isTvShow);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    })
                    .catch(function(err) {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка поиска: ' + err.message);
                    });
                }
            });
        });
    }

    // Безопасный fetch с обходом CORS ограничений
    function kpFetch(endpoint, token, cb) {
        var cleanUrl = 'https://kinopoiskapiunofficial.tech/api/' + endpoint;
        var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(cleanUrl);

        fetch(proxyUrl, {
            method: 'GET',
            headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
        })
        .then(function(res) {
            if (!res.ok) throw new Error('Код: ' + res.status);
            return res.json();
        })
        .then(function(json) {
            Lampa.Loading.stop();
            if (json) cb(json);
        })
        .catch(function(err) {
            Lampa.Loading.stop();
            Lampa.Noty.show('Ошибка данных: ' + err.message);
        });
    }

    // Главное меню выбора материалов
    function openMenu(kp_id, token, movieTitle, movieYear, isTvShow) {
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
                    kpFetch('v2.2/films/' + kp_id + '/similars', token, function(json) {
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
                                    // ИСПРАВЛЕНО: Закрываем все слои старого меню, чтобы не ломать фокус Lampa
                                    Lampa.Select.close();
                                    Lampa.Modal.close();
                                    Lampa.Loading.start();
                                    
                                    var cleanUrl = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id;
                                    var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(cleanUrl);

                                    fetch(proxyUrl, {
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
                                            // ИСПРАВЛЕНО: Прямой и мгновенный переход на полноценную страницу фильма
                                            Lampa.Activity.push({
                                                url: '',
                                                component: 'full',
                                                id: details.imdbId,
                                                method: method,
                                                source: 'imdb'
                                            });
                                        } else {
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
                                onBack: function() { openMenu(kp_id, token, movieTitle, movieYear, isTvShow); }
                            });
                        } else {
                            Lampa.Noty.show('Похожих фильмов не найдено.');
                            Lampa.Controller.toggle('content');
                        }
                    });
                } else {
                    showContentModal(kp_id, token, item.action, item.title, movieTitle, movieYear, isTvShow);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Отображение контента во всплывающем окне
    function showContentModal(kp_id, token, action, menuTitle, movieTitle, movieYear, isTvShow) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        kpFetch(url, token, function(json) {
            var html = '<div style="padding: 15px; text-align: left; font-size: 1.1em; line-height: 1.5; color: #ddd; max-height: 70vh; overflow-y: auto;">';
            
            if (action === 'facts' || action === 'bloopers') {
                var typeFilter = action === 'facts' ? 'FACT' : 'BLOOPER';
                var count = 0;
                if (json && json.items) {
                    for (var i = 0; i < json.items.length; i++) {
                        if (json.items[i].type === typeFilter) {
                            count++;
                            var cleanText = json.items[i].text.replace(/<[^>]+>/g, '');
                            var spoiler = json.items[i].spoiler ? '<span class="kp-spoiler">СПОЙЛЕР</span>' : '';
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
                    openMenu(kp_id, token, movieTitle, movieYear, isTvShow);
                }
            });
        });
    }

    if (!window.free_kp_extended_ready) startPlugin();
})();

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

// Загрузка контента во всплывающее окно Lampa
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
