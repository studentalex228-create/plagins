(function () {
    "use strict";

    var token = "";

    // 🎨 ВНЕДРЕНИЕ СТИЛЕЙ
    if (!document.getElementById('kp-extended-css')) {
        var style = document.createElement('style');
        style.id = 'kp-extended-css';
        style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
        document.head.appendChild(style);
    }

    // 🌐 СЕТЕВАЯ ФУНКЦИЯ Fetch с обходом CORS-блокировок
    function kpFetch(endpoint, successCb) {
        var cleanUrl = 'https://kinopoiskapiunofficial.tech/api/' + endpoint;
        var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(cleanUrl);

        fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'X-API-KEY': token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(res) {
            if (!res.ok) throw new Error('Status: ' + res.status);
            return res.json();
        })
        .then(function(json) {
            Lampa.Loading.stop();
            if (json) successCb(json);
        })
        .catch(function(err) {
            Lampa.Loading.stop();
            Lampa.Noty.show('Ошибка Кинопоиска');
            console.error(err);
        });
    }

    // 📋 ОТОБРАЖЕНИЕ ВСПЛЫВАЮЩЕГО ОКНА С ТЕКСТОМ ИЛИ ОБОЯМИ
    function showContentModal(kp_id, action, menuTitle, movieTitle, movieYear, isTvShow) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        kpFetch(url, function(json) {
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
                    openMainMenu(kp_id, movieTitle, movieYear, isTvShow);
                }
            });
        });
    }

    // 👥 ПОЛУЧЕНИЕ ПОХОЖИХ ФИЛЬМОВ С НАПРАВЛЕННЫМ ПЕРЕХОДОМ НА КАРТОЧКУ
    function handleSimilars(kp_id, movieTitle, movieYear, isTvShow) {
        Lampa.Loading.start();
        kpFetch('v2.2/films/' + kp_id + '/similars', function(json) {
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
                        
                        var dUrl = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id;
                        var dProxy = 'https://corsproxy.io/?' + encodeURIComponent(dUrl);

                        fetch(dProxy, {
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
                    onBack: function() { openMainMenu(kp_id, movieTitle, movieYear, isTvShow); }
                });
            } else {
                Lampa.Noty.show('Похожих фильмов не найдено.');
                Lampa.Controller.toggle('content');
            }
        });
    }

    // 📋 ГЛАВНОЕ МЕНЮ ВЫБОРА МАТЕРИАЛОВ
    function openMainMenu(kp_id, movieTitle, movieYear, isTvShow) {
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
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    handleSimilars(kp_id, movieTitle, movieYear, isTvShow);
                } else {
                    showContentModal(kp_id, item.action, item.title, movieTitle, movieYear, isTvShow);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // 🎬 ЗАПУСК СЛУШАТЕЛЯ И СОЗДАНИЕ КНОПКИ (По структуре rezkacomment.js)
    function startPlugin() {
        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            $(".button--kp-main-plus").remove();

            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on("hover:enter", function () {
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
(function () {
    "use strict";

    // 🎨 ВНЕДРЕНИЕ СТИЛЕЙ
    if (!document.getElementById('kp-extended-css')) {
        var style = document.createElement('style');
        style.id = 'kp-extended-css';
        style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
        document.head.appendChild(style);
    }

    // Универсальный сетевой обработчик через нативное ядро Lampa (без CORS и CSP блокировок)
    function makeKpRequest(url, token, onSuccess, onError) {
        var network = new Lampa.Reguest();
        network.silent(url, function(response) {
            var json = response;
            // Если Lampa вернула сырую строку, безопасно переводим её в объект
            if (typeof response === 'string') {
                try { 
                    json = JSON.parse(response); 
                } catch(err) { 
                    json = {}; 
                }
            }
            onSuccess(json);
        }, function(err) {
            Lampa.Loading.stop();
            var statusText = '';
            if (err && err.status) statusText = ' (Код: ' + err.status + ')';
            Lampa.Noty.show('Кинопоиск не ответил' + statusText);
            if (onError) onError();
        }, false, {
            headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' },
            timeout: 10000
        });
    }

    // Всплывающее окно с контентом (Факты, ляпы, награды, фото)
    function showContentModal(kp_id, token, action, menuTitle, movieTitle, movieYear, isTvShow) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/' + url, token, function(json) {
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
                    openMainMenu(kp_id, token, movieTitle, movieYear, isTvShow);
                }
            });
        });
    }

    // Похожие фильмы с прямым переходом на нативную карточку Lampa
    function handleSimilars(kp_id, token, movieTitle, movieYear, isTvShow) {
        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', token, function(json) {
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
                        
                        makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id, token, function(details) {
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
                                setTimeout(function() {
                                    Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                                }, 150);
                            }
                        }, function() {
                            Lampa.Loading.stop();
                            setTimeout(function() {
                                Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                            }, 150);
                        });
                    },
                    onBack: function() { openMainMenu(kp_id, token, movieTitle, movieYear, isTvShow); }
                });
            } else {
                Lampa.Noty.show('Похожих фильмов не найдено.');
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Главное меню выбора материалов Кинопоиска
    function openMainMenu(kp_id, token, movieTitle, movieYear, isTvShow) {
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
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    handleSimilars(kp_id, token, movieTitle, movieYear, isTvShow);
                } else {
                    showContentModal(kp_id, token, item.action, item.title, movieTitle, movieYear, isTvShow);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // ЗАПУСК ПЛАГИНА (По пуленепробиваемой структуре rezkacomment.js)
    function startPlugin() {
        window.free_kp_extended_ready = true;

        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            page.find(".button--kp-main-plus").remove();

            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on("hover:enter", function () {
                var currentToken = Lampa.Storage.get('kp_unofficial_token', '');

                if (!currentToken) {
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
                    openMainMenu(kpid, currentToken, movieTitle, movieYear, isTvShow);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, currentToken, function(searchJson) {
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
(function () {
    "use strict";

    var token = "";

    // 🎨 ВНЕДРЕНИЕ СТИЛЕЙ
    if (!document.getElementById('kp-extended-css')) {
        var style = document.createElement('style');
        style.id = 'kp-extended-css';
        style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
        document.head.appendChild(style);
    }

    // Универсальный сетевой обработчик через нативное ядро Lampa (Защита от CORS и блокировок)
    function makeKpRequest(url, onSuccess, onError) {
        var RequestConstructor = Lampa.Reguest || Lampa.Request;
        if (!RequestConstructor) {
            Lampa.Loading.stop();
            Lampa.Noty.show("Ошибка ядра Lampa (Request)");
            return;
        }

        var network = new RequestConstructor();
        network.silent(url, function(response) {
            var json = response;
            if (typeof response === 'string') {
                try { 
                    json = JSON.parse(response); 
                } catch(err) { 
                    json = {}; 
                }
            }
            onSuccess(json);
        }, function(err) {
            Lampa.Loading.stop();
            var statusText = '';
            if (err && err.status) statusText = ' (Код: ' + err.status + ')';
            Lampa.Noty.show('Кинопоиск не ответил' + statusText);
            if (onError) onError();
        }, false, {
            headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' },
            timeout: 10000
        });
    }

    // Всплывающее окно с контентом (Факты, ляпы, награды, фото)
    function showContentModal(kp_id, action, menuTitle, movieTitle, movieYear, isTvShow) {
        var url = '';
        if (action === 'facts' || action === 'bloopers') url = 'v2.2/films/' + kp_id + '/facts';
        if (action === 'awards') url = 'v2.2/films/' + kp_id + '/awards';
        if (action === 'stills') url = 'v2.2/films/' + kp_id + '/images?type=STILL&page=1';
        if (action === 'posters') url = 'v2.2/films/' + kp_id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/' + url, function(json) {
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
                    openMainMenu(kp_id, movieTitle, movieYear, isTvShow);
                }
            });
        });
    }

    // Похожие фильмы с направленным переходом на сочную карточку Lampa
    function handleSimilars(kp_id, movieTitle, movieYear, isTvShow) {
        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', function(json) {
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
                        
                        makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id, function(details) {
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
                                setTimeout(function() {
                                    Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                                }, 150);
                            }
                        }, function() {
                            Lampa.Loading.stop();
                            setTimeout(function() {
                                Lampa.Activity.push({ component: 'search', query: selectedSim.title });
                            }, 150);
                        });
                    },
                    onBack: function() { openMainMenu(kp_id, movieTitle, movieYear, isTvShow); }
                });
            } else {
                Lampa.Noty.show('Похожих фильмов не найдено.');
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Главное меню выбора материалов Кинопоиска
    function openMainMenu(kp_id, movieTitle, movieYear, isTvShow) {
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
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: token, free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    handleSimilars(kp_id, movieTitle, movieYear, isTvShow);
                } else {
                    showContentModal(kp_id, item.action, item.title, movieTitle, movieYear, isTvShow);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Запуск слушателя
    function startPlugin() {
        window.free_kp_extended_ready = true;

        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            var page = e.object.activity.render();
            page.find(".button--kp-main-plus").remove();

            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            btn.on("hover:enter", function () {
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
                    openMainMenu(kpid, movieTitle, movieYear, isTvShow);
                } else {
                    var searchQuery = encodeURIComponent(movieTitle);
                    makeKpRequest('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery, function(searchJson) {
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
                            openMainMenu(bestMatch, movieTitle, movieYear, isTvShow);
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    }, function() {
                        Lampa.Loading.stop();
                    });
                }
            });

            var btnContainer = page.find('.full-start-new__buttons').length ? page.find('.full-start-new__buttons') : page.find('.full-start__buttons');
            if (btnContainer.length) {
                btnContainer.append(btn);
            }
        });
    }

    // 🔥 БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ (Исключает Script error на старте)
    if (window.Lampa) {
        startPlugin();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa) {
                clearInterval(timer);
                startPlugin();
            }
        }, 100);
    }
})();

                             }
                            }
                            openMainMenu(bestMatch, movieTitle, movieYear, isTvShow);
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

            var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
            if (btnContainer.length) {
                btnContainer.append(btn);
            }
        });
    }

    startPlugin();
})();
