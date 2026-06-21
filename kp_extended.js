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
