(function () {
    "use strict";

    // Единый глобальный контекст для хранения данных активного фильма (Исключает баги с аргументами)
    var KP_CTX = {
        token: "",
        id: "",
        title: "",
        year: "",
        isTv: false
    };

    // Нативный сетевой обработчик Lampa (Защищен от CORS блокировок сайта cf.lampa.mx)
    function makeKpRequest(url, onSuccess) {
        var RequestConstructor = Lampa.Reguest || Lampa.Request;
        if (!RequestConstructor) {
            Lampa.Loading.stop();
            Lampa.Noty.show("Сетевой модуль Lampa не готов");
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
        }, false, {
            headers: { 'X-API-KEY': KP_CTX.token, 'Content-Type': 'application/json' },
            timeout: 10000
        });
    }

    // Всплывающее окно с контентом (Факты, ляпы, награды, фото)
    function showContentModal(action, menuTitle) {
        var path = '';
        if (action === 'facts' || action === 'bloopers') path = 'v2.2/films/' + KP_CTX.id + '/facts';
        if (action === 'awards') path = 'v2.2/films/' + KP_CTX.id + '/awards';
        if (action === 'stills') path = 'v2.2/films/' + KP_CTX.id + '/images?type=STILL&page=1';
        if (action === 'posters') path = 'v2.2/films/' + KP_CTX.id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/' + path, function(json) {
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
                    openMainMenu();
                }
            });
        });
    }

    // Похожие фильмы с направленным переходом на карточку Lampa
    function handleSimilars() {
        Lampa.Loading.start();
        var url = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + KP_CTX.id + '/similars';
        makeKpRequest(url, function(json) {
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
                        
                        var detailUrl = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id;
                        makeKpRequest(detailUrl, function(details) {
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
                        });
                    },
                    onBack: function() { openMainMenu(); }
                });
            } else {
                Lampa.Noty.show('Похожих фильмов не найдено.');
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Главное меню выбора материалов Кинопоиска
    function openMainMenu() {
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
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: KP_CTX.token, free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    handleSimilars();
                } else {
                    showContentModal(item.action, item.title);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Инициализация слушателя интерфейса Lampa (По пуленепробиваемой структуре rezkacomment.js)
    function startPlugin() {
        window.free_kp_extended_ready = true;

        if (!document.getElementById('kp-extended-css')) {
            var style = document.createElement('style');
            style.id = 'kp-extended-css';
            style.innerHTML = '.kp-spoiler { color: #ff5252; font-weight: bold; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-block; }';
            document.head.appendChild(style);
        }

        // ИСПРАВЛЕНО: Возвращена историческая опечатка "complite" (через i) — ядро Lampa теперь принимает событие!
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

                // Инициализируем плоский контекст KP_CTX данными активного фильма
                KP_CTX.token = currentToken;
                KP_CTX.title = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                KP_CTX.isTv = !!e.data.movie.name;
                KP_CTX.year = '';
                if (e.data.movie.release_date) KP_CTX.year = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) KP_CTX.year = ('' + e.data.movie.first_air_date).split('-')[0];

(function () {
    "use strict";

    var KP_CTX = {
        token: "",
        id: "",
        title: "",
        year: "",
        isTv: false
    };

    function makeKpRequest(url, onSuccess) {
        var RequestConstructor = Lampa.Reguest || Lampa.Request;
        if (!RequestConstructor) {
            Lampa.Loading.stop();
            Lampa.Noty.show("Сетевой модуль Lampa не готов");
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
        }, false, {
            headers: { 'X-API-KEY': KP_CTX.token, 'Content-Type': 'application/json' },
            timeout: 10000
        });
    }

    function showContentModal(action, menuTitle) {
        var path = '';
        if (action === 'facts' || action === 'bloopers') path = 'v2.2/films/' + KP_CTX.id + '/facts';
        if (action === 'awards') path = 'v2.2/films/' + KP_CTX.id + '/awards';
        if (action === 'stills') path = 'v2.2/films/' + KP_CTX.id + '/images?type=STILL&page=1';
        if (action === 'posters') path = 'v2.2/films/' + KP_CTX.id + '/images?type=POSTER&page=1';

        Lampa.Loading.start();
        makeKpRequest('https://kinopoiskapiunofficial.tech/api/' + path, function(json) {
            Lampa.Loading.stop(); // ОСТАНОВКА ЗАГРУЗКИ ПЕРЕД ОТКРЫТИЕМ ОКНА
            
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
                    openMainMenu();
                }
            });
        });
    }

    function handleSimilars() {
        Lampa.Loading.start();
        var url = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + KP_CTX.id + '/similars';
        makeKpRequest(url, function(json) {
            Lampa.Loading.stop(); // ОСТАНОВКА ЗАГРУЗКИ ПЕРЕД ОТКРЫТИЕМ СПИСКА
            
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
                        
                        var detailUrl = 'https://kinopoiskapiunofficial.tech/api/v2.2/films/' + selectedSim.id;
                        makeKpRequest(detailUrl, function(details) {
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
                        });
                    },
                    onBack: function() { openMainMenu(); }
                });
            } else {
                Lampa.Noty.show('Похожих фильмов не найдено.');
                Lampa.Controller.toggle('content');
            }
        });
    }

    function openMainMenu() {
        Lampa.Loading.stop(); // ГАРАНТИРОВАННОЕ СНЯТИЕ ВСЕХ СПИННЕРОВ ЗАГРУЗКИ
        
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
                    Lampa.Input.edit({ title: 'Изменить API Ключ', value: KP_CTX.token, free: true }, function (new_val) {
                        if (new_val) Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                        Lampa.Controller.toggle('content');
                    });
                } else if (item.action === 'similars') {
                    handleSimilars();
                } else {
                    showContentModal(item.action, item.title);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

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

                KP_CTX.token = currentToken;
                KP_CTX.title = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                KP_CTX.isTv = !!e.data.movie.name;
                KP_CTX.year = '';
                if (e.data.movie.release_date) KP_CTX.year = ('' + e.data.movie.release_date).split('-')[0];
                else if (e.data.movie.first_air_date) KP_CTX.year = ('' + e.data.movie.first_air_date).split('-')[0];

                KP_CTX.id = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;

                if (KP_CTX.id) {
                    openMainMenu();
                } else {
                    var searchQuery = encodeURIComponent(KP_CTX.title);
                    var searchUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + searchQuery;

                    makeKpRequest(searchUrl, function(searchJson) {
                        var items = searchJson.films || searchJson.items || [];
                        if (items && items.length > 0) {
                            var bestMatch = items[0].filmId || items[0].kinopoiskId;
                            
                            if (KP_CTX.year) {
                                var targetYear = parseInt(KP_CTX.year, 10);
                                for (var f = 0; f < items.length; f++) {
                                    var kpYear = parseInt(items[f].year, 10);
                                    if (!isNaN(kpYear) && Math.abs(kpYear - targetYear) <= 1) {
                                        bestMatch = items[f].filmId || items[f].kinopoiskId;
                                        break;
                                    }
                                }
                            }
                            KP_CTX.id = bestMatch;
                            openMainMenu();
                        } else {
                            Lampa.Loading.stop();
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    });
                }
            });

            var btnContainer = page.find('.full-start-new__buttons').length ? page.find('.full-start-new__buttons') : page.find('.full-start__buttons');
            if (btnContainer.length) {
                btnContainer.append(btn);
            }
        });
    }

    if (window.Lampa && window.$) {
        startPlugin();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && window.$) {
                clearInterval(timer);
                startPlugin();
            }
        }, 100);
    }
})();

r) <= 1) {
                                        bestMatch = items[f].filmId || items[f].kinopoiskId;
                                        break;
                                    }
                                }
                            }
                            KP_CTX.id = bestMatch;
                            openMainMenu();
                        } else {
                            Lampa.Noty.show('Фильм не найден на Кинопоиске.');
                        }
                    });
                }
            });

            var btnContainer = page.find('.full-start-new__buttons').length ? page.find('.full-start-new__buttons') : page.find('.full-start__buttons');
            if (btnContainer.length) {
                btnContainer.append(btn);
            }
        });
    }

    // ТАЙМЕР ОЖИДАНИЯ СИСТЕМЫ (Ждет полной загрузки Lampa и jQuery графики)
    if (window.Lampa && window.$) {
        startPlugin();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && window.$) {
                clearInterval(timer);
                startPlugin();
            }
        }, 100);
    }
})();
