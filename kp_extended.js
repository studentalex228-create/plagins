(function () {
    'use strict';

    function startPlugin() {
        window.free_kp_extended_ready = true;

        // Создаем раздел в настройках Lampa
        Lampa.SettingsApi.addComponent({
            component: 'free_kp_extended',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>',
            name: 'Кинопоиск (API)'
        });

        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'title' },
            field: { name: 'Авторизация' }
        });

        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'button' },
            field: { name: 'Ввести API Ключ', description: 'Нажмите для ввода токена с сайта kinopoiskapiunofficial.tech' },
            onChange: function () {
                Lampa.Input.edit({
                    title: 'Ввод ключа',
                    value: Lampa.Storage.get('kp_unofficial_token', ''),
                    free: true
                }, function (new_value) {
                    if (new_value) {
                        Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                        Lampa.Noty.show('API Ключ успешно сохранен!');
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'title' },
            field: { name: 'Отображение' }
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_slogan', type: 'trigger', default: true }, field: { name: 'Показывать слоган' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_similars', type: 'trigger', default: true }, field: { name: 'Похожие фильмы (вместо Cub)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_facts', type: 'trigger', default: true }, field: { name: 'Показывать интересные факты' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_bloopers', type: 'trigger', default: true }, field: { name: 'Показывать ошибки (киноляпы)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_awards', type: 'trigger', default: true }, field: { name: 'Показывать награды' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_stills', type: 'trigger', default: true }, field: { name: 'Показывать кадры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_posters', type: 'trigger', default: true }, field: { name: 'Показывать постеры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_wallpapers', type: 'trigger', default: true }, field: { name: 'Показывать обои' }});

        // Слушатель карточки фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            if (!e.data || !e.data.movie) return;

            var token = Lampa.Storage.get('kp_unofficial_token', '');
            if (!token) return;

            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title;
            var movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];
            
            Lampa.Noty.show('🔌 Ищу «' + movieTitle + '» на Кинопоиске...');

            // Функция для безопасных запросов через CORS-прокси
            function apiRequest(url, successCallback, errorCallback) {
                var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                $.ajax({
                    url: proxyUrl,
                    type: 'GET',
                    headers: { 'X-API-KEY': token },
                    dataType: 'json',
                    success: successCallback,
                    error: function(xhr, status, err) {
                        if (errorCallback) errorCallback(err);
                    }
                });
            }

            function createSection(id, title) {
                if ($('.' + id).length > 0) return;
                var html = '<div class="items-line layer--visible layer--render ' + id + '" style="display: none;">' +
                            '<div class="items-line__head"><div class="items-line__title">' + title + '</div></div>' +
                            '<div class="items-line__body">' +
                                '<div class="scroll scroll--horizontal">' +
                                    '<div class="scroll__content"><div class="scroll__body full-reviews ' + id + '-items"></div></div>' +
                                </div>' +
                            '</div>' +
                        '</div>';
                
                var target = $('.items-line:first');
                if (target.length > 0) target.after(html);
                else $('.full-start-new__details').append(html);
            }

            function loadMainInfo(kp_id) {
                apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id, function (json) {
                    if (json && json.slogan && json.slogan !== '-') {
                        if ($('.kp-slogan').length === 0) {
                            var sloganHtml = '<div class="kp-slogan" style="font-style: italic; color: #a9a9a9; margin-bottom: 12px; font-size: 1.1em;">&laquo;' + json.slogan + '&raquo;</div>';
                            var desc = $('.full-start-new__description, .full-start__description');
                            if (desc.length) desc.before(sloganHtml);
                            else $('.full-start-new__details').append(sloganHtml);
                        }
                    }
                });
            }

            function loadSimilars(kp_id) {
                apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        $('.items-line__title').filter(function() {
                            var text = $(this).text().toLowerCase();
                            return text.indexOf('рекомендуем') !== -1 || text.indexOf('похожи') !== -1 || text.indexOf('связанн') !== -1;
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        var itemsBlock = $('.kp-similars-items');
                        
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var sim = json.items[i];
                                var name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                                var poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                                var item = $('<div class="selector layer--visible" style="width: 130px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer;">' +
                                                '<img src="' + poster + '" style="width: 130px; height: 195px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" />' +
                                                '<div style="margin-top: 6px; font-size: 0.85em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;">' + name + '</div>' +
                                            '</div>');
                                
                                item.on('hover:enter', function () {
                                    Lampa.Noty.show('Загрузка карточки...');
                                    // Переход по похожим тоже делаем через текстовый поиск Кинопоиска (Защита от CORS)
                                    apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + sim.filmId, function(simDetails) {
                                        if (simDetails && simDetails.imdbId) {
                                            Lampa.Activity.push({ url: '', component: 'full', id: simDetails.imdbId, method: isTvShow ? 'tv' : 'movie', source: 'imdb' });
                                        } else {
                                            Lampa.Activity.push({ component: 'search', query: name });
                                        }
                                    }, function() {
                                        Lampa.Activity.push({ component: 'search', query: name });
                                    });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                        $('.kp-similars').show();
                    }
                });
            }

            function loadFactsAndBloopers(kp_id) {
                apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/facts', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        var facts = [];
                        var bloopers = [];

                        for (var i = 0; i < json.items.length; i++) {
                            if (json.items[i].type === 'FACT') facts.push(json.items[i]);
                            if (json.items[i].type === 'BLOOPER') bloopers.push(json.items[i]);
                        }

                        function renderTextBlocks(dataList, containerClass, title, modalTitle) {
                            if (dataList.length === 0) return;
                            createSection(containerClass, title);
                            var container = $('.' + containerClass);
                            var itemsBlock = $('.' + containerClass + '-items');
                            var full_text_html = '';
                            
                            for (var j = 0; j < dataList.length; j++) {
                                var clean_text = dataList[j].text.replace(/<[^>]+>/g, '');
                                var spoilerTag = dataList[j].spoiler ? '<span style="color:#EA4E4E; font-weight:bold;">[СПОЙЛЕР]</span> ' : '';
                                full_text_html += spoilerTag + clean_text + '<br><br><hr style="border-color:#333;"><br>';
                            }

                            for (var k = 0; k < dataList.length; k++) {
                                (function () {
                                    var clean_text = dataList[k].text.replace(/<[^>]+>/g, '');
                                    var spoilerTag = dataList[k].spoiler ? '<span style="color:#EA4E4E; font-weight:bold;">[СПОЙЛЕР]</span> ' : '';
                                    var item = $('<div class="full-review selector layer--visible type--line"><div class="full-review__text">' + spoilerTag + clean_text + '</div></div>');
                                    
                                    item.on('hover:enter', function () {
                                        Lampa.Modal.open({
                                            title: modalTitle,
                                            html: $('<div class="broadcast__text" style="text-align:left; font-size: 1.1em;"><div class="otzyv">' + full_text_html + '</div></div>'),
                                            size: "large", mask: true, onBack: function () { Lampa.Modal.close(); }
                                        });
                                    });
                                    itemsBlock.append(item);
                                })();
                            }
                            container.show();
                        }

                        if (Lampa.Storage.get('kp_show_facts', true)) renderTextBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        if (Lampa.Storage.get('kp_show_bloopers', true)) renderTextBlocks(bloopers, 'kp-bloopers', 'Ошибки в ' + (isTvShow ? 'сериале' : 'фильме'), 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/awards', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection('kp-awards', 'Награды');
                        var itemsBlock = $('.kp-awards-items');
                        for (var i = 0; i < json.items.length; i++) {
                            var a = json.items[i];
                            var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($('<div class="full-review selector layer--visible type--line" style="min-width: 200px;"><div class="full-review__text">' + status + '<br><b>' + a.name + ' (' + a.year + ')</b><br>' + a.nominationName + '</div></div>'));
                        }
                        $('.kp-awards').show();
                    }
                });
            }

            function loadImages(kp_id, type, title, containerClass) {
                apiRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/images?type=' + type + '&page=1', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection(containerClass, title);
                        var itemsBlock = $('.' + containerClass + '-items');
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var img = json.items[i];
                                var item = $('<div class="selector layer--visible" style="margin-right: 15px; border-radius: 10px; overflow: hidden; height: 180px; position: relative; cursor: pointer; background: url(\'' + img.previewUrl + '\') center/cover no-repeat;"><img src="' + img.previewUrl + '" style="height: 180px; opacity: 0; pointer-events: none;" /></div>');
                                item.on('hover:enter', function () {
                                    Lampa.Modal.open({ title: title, html: $('<div style="text-align:center; padding: 20px;"><img src="' + img.imageUrl + '" style="max-width:100%; max-height:80vh; border-radius:10px; box-shadow: 0 5px 25px rgba(0,0,0,0.5);"></div>'), size: "large", mask: true, onBack: function () { Lampa.Modal.close(); } });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                        $('.' + containerClass).show();
                    }
                });
            }

            function startFetching(kp_id) {
                Lampa.Noty.show('✅ Фильм найден! Загружаю блоки...');
                var delay = 0;
(function () {
    'use strict';

    function startPlugin() {
        window.free_kp_extended_ready = true;

        // Создаем раздел в настройках Lampa
        Lampa.SettingsApi.addComponent({
            component: 'free_kp_extended',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>',
            name: 'Кинопоиск (API)'
        });

        // Настройки: Секция Авторизация
        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'title' },
            field: { name: 'Авторизация' }
        });

        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'button' },
            field: { name: 'Ввести API Ключ', description: 'Нажмите для ввода токена с сайта kinopoiskapiunofficial.tech' },
            onChange: function () {
                Lampa.Input.edit({
                    title: 'Ввод ключа',
                    value: Lampa.Storage.get('kp_unofficial_token', ''),
                    free: true
                }, function (new_value) {
                    if (new_value) {
                        Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                        Lampa.Noty.show('API Ключ успешно сохранен!');
                    }
                });
            }
        });

        // Настройки: Секция Отображение
        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'title' },
            field: { name: 'Отображение' }
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_slogan', type: 'trigger', default: true }, field: { name: 'Показывать слоган' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_similars', type: 'trigger', default: true }, field: { name: 'Похожие фильмы (вместо Cub)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_facts', type: 'trigger', default: true }, field: { name: 'Показывать интересные факты' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_bloopers', type: 'trigger', default: true }, field: { name: 'Показывать ошибки (киноляпы)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_awards', type: 'trigger', default: true }, field: { name: 'Показывать награды' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_stills', type: 'trigger', default: true }, field: { name: 'Показывать кадры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_posters', type: 'trigger', default: true }, field: { name: 'Показывать постеры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_wallpapers', type: 'trigger', default: true }, field: { name: 'Показывать обои' }});

        // Слушатель карточки фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            if (!e.data || !e.data.movie) return;

            var token = Lampa.Storage.get('kp_unofficial_token', '');
            if (!token) return;

            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title;
            var movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];
            
            Lampa.Noty.show('🔌 Ищу «' + movieTitle + '» на Кинопоиске...');

            // Родная функция запросов Lampa через CORS-прокси
            function sendCleanRequest(apiUrl, successCall) {
                var network = new Lampa.Reguest();
                var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);
                
                network.silent(proxyUrl, successCall, function () {
                    console.log('KP API Error', apiUrl);
                }, false, {
                    headers: {
                        'X-API-KEY': token,
                        'Content-Type': 'application/json'
                    }
                });
            }

            function createSection(id, title) {
                if ($('.' + id).length > 0) return;
                var html = '<div class="items-line layer--visible layer--render ' + id + '" style="display: none;">' +
                            '<div class="items-line__head"><div class="items-line__title">' + title + '</div></div>' +
                            '<div class="items-line__body">' +
                                '<div class="scroll scroll--horizontal">' +
                                    '<div class="scroll__content"><div class="scroll__body full-reviews ' + id + '-items"></div></div>' +
                                </div>' +
                            '</div>' +
                        '</div>';
                
                var target = $('.items-line:first');
                if (target.length > 0) target.after(html);
                else $('.full-start-new__details').append(html);
            }

            function loadMainInfo(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id, function (json) {
                    if (json && json.slogan && json.slogan !== '-') {
                        if ($('.kp-slogan').length === 0) {
                            var sloganHtml = '<div class="kp-slogan" style="font-style: italic; color: #a9a9a9; margin-bottom: 12px; font-size: 1.1em;">&laquo;' + json.slogan + '&raquo;</div>';
                            var desc = $('.full-start-new__description, .full-start__description');
                            if (desc.length) desc.before(sloganHtml);
                            else $('.full-start-new__details').append(sloganHtml);
                        }
                    }
                });
            }

            function loadSimilars(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        $('.items-line__title').filter(function() {
                            var text = $(this).text().toLowerCase();
                            return text.indexOf('рекомендуем') !== -1 || text.indexOf('похожи') !== -1 || text.indexOf('связанн') !== -1;
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        var itemsBlock = $('.kp-similars-items');
                        
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var sim = json.items[i];
                                var name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                                var poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                                var item = $('<div class="selector layer--visible" style="width: 130px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer;">' +
                                                '<img src="' + poster + '" style="width: 130px; height: 195px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" />' +
                                                '<div style="margin-top: 6px; font-size: 0.85em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;">' + name + '</div>' +
                                            '</div>');
                                
                                item.on('hover:enter', function () {
                                    Lampa.Noty.show('Загрузка карточки...');
                                    sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + sim.filmId, function(simDetails) {
                                        if (simDetails && simDetails.imdbId) {
                                            Lampa.Activity.push({ url: '', component: 'full', id: simDetails.imdbId, method: isTvShow ? 'tv' : 'movie', source: 'imdb' });
                                        } else {
                                            Lampa.Activity.push({ component: 'search', query: name });
                                        }
                                    });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                        $('.kp-similars').show();
                    }
                });
            }

            function loadFactsAndBloopers(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/facts', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        var facts = [];
                        var bloopers = [];

                        for (var i = 0; i < json.items.length; i++) {
                            if (json.items[i].type === 'FACT') facts.push(json.items[i]);
                            if (json.items[i].type === 'BLOOPER') bloopers.push(json.items[i]);
                        }

                        function renderTextBlocks(dataList, containerClass, title, modalTitle) {
                            if (dataList.length === 0) return;
                            createSection(containerClass, title);
                            var container = $('.' + containerClass);
                            var itemsBlock = $('.' + containerClass + '-items');
                            var full_text_html = '';
                            
                            for (var j = 0; j < dataList.length; j++) {
                                var clean_text = dataList[j].text.replace(/<[^>]+>/g, '');
                                var spoilerTag = dataList[j].spoiler ? '<span style="color:#EA4E4E; font-weight:bold;">[СПОЙЛЕР]</span> ' : '';
                                full_text_html += spoilerTag + clean_text + '<br><br><hr style="border-color:#333;"><br>';
                            }

                            for (var k = 0; k < dataList.length; k++) {
                                (function () {
                                    var clean_text = dataList[k].text.replace(/<[^>]+>/g, '');
                                    var spoilerTag = dataList[k].spoiler ? '<span style="color:#EA4E4E; font-weight:bold;">[СПОЙЛЕР]</span> ' : '';
                                    var item = $('<div class="full-review selector layer--visible type--line"><div class="full-review__text">' + spoilerTag + clean_text + '</div></div>');
                                    
                                    item.on('hover:enter', function () {
                                        Lampa.Modal.open({
                                            title: modalTitle,
                                            html: $('<div class="broadcast__text" style="text-align:left; font-size: 1.1em;"><div class="otzyv">' + full_text_html + '</div></div>'),
                                            size: "large", mask: true, onBack: function () { Lampa.Modal.close(); }
                                        });
                                    });
                                    itemsBlock.append(item);
                                })();
                            }
                            container.show();
                        }

                        if (Lampa.Storage.get('kp_show_facts', true)) renderTextBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        if (Lampa.Storage.get('kp_show_bloopers', true)) renderTextBlocks(bloopers, 'kp-bloopers', 'Ошибки в ' + (isTvShow ? 'сериале' : 'фильме'), 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/awards', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection('kp-awards', 'Награды');
                        var itemsBlock = $('.kp-awards-items');
                        for (var i = 0; i < json.items.length; i++) {
                            var a = json.items[i];
                            var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($('<div class="full-review selector layer--visible type--line" style="min-width: 200px;"><div class="full-review__text">' + status + '<br><b>' + a.name + ' (' + a.year + ')</b><br>' + a.nominationName + '</div></div>'));
                        }
                        $('.kp-awards').show();
                    }
                });
            }

            function loadImages(kp_id, type, title, containerClass) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/images?type=' + type + '&page=1', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection(containerClass, title);
                        var itemsBlock = $('.' + containerClass + '-items');
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var img = json.items[i];
                                var item = $('<div class="selector layer--visible" style="margin-right: 15px; border-radius: 10px; overflow: hidden; height: 180px; position: relative; cursor: pointer; background: url(\'' + img.previewUrl + '\') center/cover no-repeat;"><img src="' + img.previewUrl + '" style="height: 180px; opacity: 0; pointer-events: none;" /></div>');
                                item.on('hover:enter', function () {
                                    Lampa.Modal.open({ title: title, html: $('<div style="text-align:center; padding: 20px;"><img src="' + img.imageUrl + '" style="max-width:100%; max-height:80vh; border-radius:10px; box-shadow: 0 5px 25px rgba(0,0,0,0.5);"></div>'), size: "large", mask: true, onBack: function () { Lampa.Modal.close(); } });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                        $('.' + containerClass).show();
                    }
                });
            }

            function startFetching(kp_id) {
                Lampa.Noty.show('✅ Фильм найден! Загружаю блоки...');
                var delay = 0;
                var queue = [];

                if (Lampa.Storage.get('kp_show_slogan', true)) queue.push(function() { loadMainInfo(kp_id); });
                if (Lampa.Storage.get('kp_show_facts', true) || Lampa.Storage.get('kp_show_bloopers', true)) queue.push(function() { loadFactsAndBloopers(kp_id); });
                if (Lampa.Storage.get('kp_show_similars', true)) queue.push(function() { loadSimilars(kp_id); });
                if (Lampa.Storage.get('kp_show_awards', true)) queue.push(function() { loadAwards(kp_id); });
                if (Lampa.Storage.get('kp_show_stills', true)) queue.push(function() { loadImages(kp_id, 'STILL', 'Кадры', 'kp-stills'); });
                if (Lampa.Storage.get('kp_show_posters', true)) queue.push(function() { loadImages(kp_id, 'POSTER', 'Постеры', 'kp-posters'); });
                if (Lampa.Storage.get('kp_show_wallpapers', true)) queue.push(function() { loadImages(kp_id, 'WALLPAPER', 'Обои', 'kp-wallpapers'); });

                for (var i = 0; i < queue.length; i++) {
                    setTimeout(queue[i], delay);
                    delay += 300;
                }
            }

            // Текстовый поиск Кинопоиска (Защищено от CORS и работает для новинок 2026)
            var kp_id = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
            
            if (kp_id) {
                startFetching(kp_id);
            } else {
                var searchQuery = movieTitle + (movieYear ? ' ' + movieYear : '');
                var searchUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(searchQuery);
                
                sendCleanRequest(searchUrl, function(searchJson) {
                    if (searchJson && searchJson.films && searchJson.films.length > 0) {
                        startFetching(searchJson.films[0].filmId);
                    } else {
                        Lampa.Noty.show('❌ Фильм не найден на Кинопоиска.');
                    }
                });
            }
        });
    }

    if (!window.free_kp_extended_ready) startPlugin();

})();
            var searchUrl = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(searchQuery);
                
                apiRequest(searchUrl, function(searchJson) {
                    if (searchJson && searchJson.films && searchJson.films.length > 0) {
                        startFetching(searchJson.films[0].filmId);
                    } else {
                        Lampa.Noty.show('❌ Фильм не найден на Кинопоиске.');
                    }
                }, function() {
                    Lampa.Noty.show('❌ Ошибка сети прокси при поиске.');
                });
            }
        });
    }

    if (window.Lampa) {
        startPlugin();
    } else {
        if (window.LampaListener) {
            window.LampaListener.follow('app', function (e) {
                if (e.type == 'ready' && !window.free_kp_extended_ready) startPlugin();
            });
        } else {
            setTimeout(function() {
                if (!window.free_kp_extended_ready) startPlugin();
            }, 1000);
        }
    }

})();
