(function () {
    'use strict';

    function startPlugin() {
        window.free_kp_extended_ready = true;

        // Внедряем красивые стили (CSS) для эстетики
        if (!$('#kp-extended-css').length) {
            var css = [
                '.kp-slogan { font-style: italic; color: rgba(255,255,255,0.7); margin: 20px 0; font-size: 1.2em; border-left: 3px solid #f60; padding-left: 15px; line-height: 1.4; }',
                '.kp-review-card { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); transition: background 0.3s, transform 0.3s; height: 100%; }',
                '.kp-review-card.focus { background: rgba(255,255,255,0.15); transform: scale(1.02); box-shadow: 0 0 0 2px #fff; }',
                '.kp-spoiler { color: #ff5252; font-weight: bold; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; margin-right: 8px; background: rgba(255,82,82,0.15); padding: 3px 8px; border-radius: 6px; }',
                '.kp-image-card { border-radius: 12px; overflow: hidden; height: 180px; position: relative; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: transform 0.3s; }',
                '.kp-image-card.focus { transform: scale(1.05); box-shadow: 0 0 0 3px #fff; }',
                '.kp-similar-card { width: 140px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer; transition: transform 0.3s; }',
                '.kp-similar-card.focus { transform: translateY(-8px); }',
                '.kp-similar-card.focus .kp-similar-poster { box-shadow: 0 0 0 3px #fff, 0 8px 20px rgba(0,0,0,0.5); }',
                '.kp-similar-poster { width: 140px; height: 210px; border-radius: 12px; object-fit: cover; box-shadow: 0 5px 15px rgba(0,0,0,0.4); transition: box-shadow 0.3s; }',
                '.kp-similar-title { margin-top: 10px; font-size: 0.9em; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; color: #ddd; }',
                '.kp-award-text { line-height: 1.4; font-size: 1.05em; }',
                '.kp-modal-text { font-size: 1.15em; line-height: 1.6; padding: 10px; color: #eee; }',
                '.kp-modal-text hr { border-color: rgba(255,255,255,0.1); margin: 20px 0; }'
            ].join(' ');
            $('head').append('<style id="kp-extended-css">' + css + '</style>');
        }

        Lampa.SettingsApi.addComponent({
            component: 'free_kp_extended',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>',
            name: 'Кинопоиск (API)'
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { type: 'title' }, field: { name: 'Авторизация' } });
        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'button' },
            field: { name: 'Ввести API Ключ', description: 'Нажмите для ввода токена с сайта kinopoiskapiunofficial.tech' },
            onChange: function () {
                Lampa.Input.edit({ title: 'Ввод ключа', value: Lampa.Storage.get('kp_unofficial_token', ''), free: true }, function (new_value) {
                    if (new_value) {
                        Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                        Lampa.Noty.show('API Ключ успешно сохранен!');
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { type: 'title' }, field: { name: 'Отображение' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_slogan', type: 'trigger', default: true }, field: { name: 'Показывать слоган' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_similars', type: 'trigger', default: true }, field: { name: 'Похожие фильмы (вместо Cub)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_facts', type: 'trigger', default: true }, field: { name: 'Показывать интересные факты' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_bloopers', type: 'trigger', default: true }, field: { name: 'Показывать ошибки (киноляпы)' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_awards', type: 'trigger', default: true }, field: { name: 'Показывать награды' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_stills', type: 'trigger', default: true }, field: { name: 'Показывать кадры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_posters', type: 'trigger', default: true }, field: { name: 'Показывать постеры' }});
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_wallpapers', type: 'trigger', default: true }, field: { name: 'Показывать обои' }});

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var token = Lampa.Storage.get('kp_unofficial_token', '');
            if (!token) return;

            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title;
            var movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];

            function sendCleanRequest(apiUrl, successCall) {
                var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);
                fetch(proxyUrl, { method: 'GET', headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' } })
                .then(function (res) { return res.json(); })
                .then(function (json) { if (json) successCall(json); })
                .catch(function (err) { console.log('KP API Error', err); });
            }

            function createSection(id, title) {
                var activeView = $('.activity__active');
                if (activeView.find('.' + id).length > 0) return;
                
                var html = '<div class="items-line layer--visible layer--render ' + id + '" style="display: none;">' +
                            '<div class="items-line__head"><div class="items-line__title">' + title + '</div></div>' +
                            '<div class="items-line__body">' +
                                '<div class="scroll scroll--horizontal">' +
                                    '<div class="scroll__content"><div class="scroll__body full-reviews ' + id + '-items" style="padding: 10px 0;"></div></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
                
                var targetLine = activeView.find('.items-line').last();
                if (targetLine.length > 0) targetLine.after(html);
                else activeView.find('.full-start-new__details, .full-start__details').append(html);
            }

            function loadMainInfo(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id, function (json) {
                    var activeView = $('.activity__active');
                    if (json && json.slogan && json.slogan !== '-') {
                        if (activeView.find('.kp-slogan').length === 0) {
                            var sloganHtml = '<div class="kp-slogan">&laquo;' + json.slogan + '&raquo;</div>';
                            var desc = activeView.find('.full-start-new__description, .full-start__description');
                            if (desc.length) desc.before(sloganHtml);
                            else activeView.find('.full-start-new__details').append(sloganHtml);
                        }
                    }
                });
            }

            function loadSimilars(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/similars', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        var activeView = $('.activity__active');
                        activeView.find('.items-line__title').filter(function() {
                            var text = $(this).text().toLowerCase();
                            return text.indexOf('рекомендуем') !== -1 || text.indexOf('похожи') !== -1 || text.indexOf('связанн') !== -1;
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        var itemsBlock = activeView.find('.kp-similars-items');
                        
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var sim = json.items[i];
                                var name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                                var poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                                var item = $('<div class="selector layer--visible kp-similar-card">' +
                                                '<img src="' + poster + '" class="kp-similar-poster" />' +
                                                '<div class="kp-similar-title">' + name + '</div>' +
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
                        activeView.find('.kp-similars').show();
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
                            var activeView = $('.activity__active');
                            var container = activeView.find('.' + containerClass);
                            var itemsBlock = activeView.find('.' + containerClass + '-items');
                            var full_text_html = '';
                            
                            for (var j = 0; j < dataList.length; j++) {
                                var clean_text = dataList[j].text.replace(/<[^>]+>/g, '');
                                var spoilerTag = dataList[j].spoiler ? '<span class="kp-spoiler">[СПОЙЛЕР]</span>' : '';
                                full_text_html += spoilerTag + clean_text + '<br><br><hr><br>';
                            }

                            for (var k = 0; k < dataList.length; k++) {
                                (function () {
                                    var clean_text = dataList[k].text.replace(/<[^>]+>/g, '');
                                    var spoilerTag = dataList[k].spoiler ? '<span class="kp-spoiler">СПОЙЛЕР</span>' : '';
                                    var preview_text = clean_text.length > 200 ? clean_text.substring(0, 200) + '...' : clean_text;
                                    
                                    var item = $('<div class="full-review selector layer--visible type--line kp-review-card">' +
                                                    '<div class="full-review__text">' + spoilerTag + preview_text + '</div>' +
                                                '</div>');
                                    
                                    item.on('hover:enter', function () {
                                        Lampa.Modal.open({
                                            title: modalTitle,
                                            html: $('<div class="broadcast__text kp-modal-text"><div class="otzyv">' + full_text_html + '</div></div>'),
                                            size: "large", mask: true, onBack: function () { Lampa.Modal.close(); }
                                        });
                                    });
                                    itemsBlock.append(item);
                                })();
                            }
                            container.show();
                        }

                        if (Lampa.Storage.get('kp_show_facts', true)) renderTextBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        if (Lampa.Storage.get('kp_show_bloopers', true)) renderTextBlocks(bloopers, 'kp-bloopers', 'Ошибки ' + (isTvShow ? 'в сериале' : 'в фильме'), 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/awards', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection('kp-awards', 'Награды');
                        var activeView = $('.activity__active');
                        var itemsBlock = activeView.find('.kp-awards-items');
                        for (var i = 0; i < json.items.length; i++) {
                            var a = json.items[i];
                            var status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($('<div class="full-review selector layer--visible type--line kp-review-card" style="min-width: 220px;">' +
                                                '<div class="full-review__text kp-award-text">' + status + '<br><b style="color:#fff;">' + a.name + ' (' + a.year + ')</b><br><span style="color:#aaa;">' + a.nominationName + '</span></div>' +
                                                '</div>'));
                        }
                        activeView.find('.kp-awards').show();
                    }
                });
            }

            function loadImages(kp_id, type, title, containerClass) {
                sendCleanRequest('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id + '/images?type=' + type + '&page=1', function (json) {
                    if (json && json.items && json.items.length > 0) {
                        createSection(containerClass, title);
                        var activeView = $('.activity__active');
                        var itemsBlock = activeView.find('.' + containerClass + '-items');
                        for (var i = 0; i < json.items.length; i++) {
                            (function () {
                                var img = json.items[i];
                                var item = $('<div class="selector layer--visible kp-image-card" style="margin-right: 15px; width: 320px; background: url(\'' + img.previewUrl + '\') center/cover no-repeat;"></div>');
                                item.on('hover:enter', function () {
                                    Lampa.Modal.open({ title: title, html: $('<div style="text-align:center; padding: 20px;"><img src="' + img.imageUrl + '" style="max-width:100%; max-height:80vh; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7);"></div>'), size: "large", mask: true, onBack: function () { Lampa.Modal.close(); } });
                                });
                                itemsBlock.append(item);
                            })();
                        }
                        activeView.find('.' + containerClass).show();
                    }
                });
            }
(function () {
    "use strict";

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎨 ВНЕДРЕНИЕ ПРЕМИУМ-ДИЗАЙНА (CSS)
        if (!document.getElementById("kp-extended-css")) {
            const style = document.createElement("style");
            style.id = "kp-extended-css";
            style.innerHTML = `
                .kp-slogan { font-style: italic; color: #a9a9a9; margin-bottom: 12px; font-size: 1.15em; border-left: 3px solid #f60; padding-left: 10px; }
                .kp-review-card { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s, box-shadow 0.2s; height: 100%; display: flex; align-items: center; }
                .kp-review-card.focus { transform: scale(1.02); box-shadow: 0 0 0 2px #fff; background: rgba(255,255,255,0.15); }
                .kp-spoiler { color: #ff5252; font-weight: 700; font-size: 0.85em; text-transform: uppercase; margin-right: 6px; background: rgba(255,82,82,0.15); padding: 2px 6px; border-radius: 4px; }
                .kp-image-card { border-radius: 12px; overflow: hidden; height: 180px; width: 320px; position: relative; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.2s; }
                .kp-image-card.focus { transform: scale(1.03); box-shadow: 0 0 0 3px #fff; }
                .kp-similar-wrap { width: 130px; margin-right: 15px; display: inline-block; vertical-align: top; text-align: center; cursor: pointer; }
                .kp-similar-poster { width: 130px; height: 195px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s; }
                .kp-similar-wrap.focus .kp-similar-poster { transform: scale(1.05); box-shadow: 0 0 0 3px #fff; }
                .kp-similar-title { margin-top: 8px; font-size: 0.85em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #eee; }
                .kp-modal-text { font-size: 1.1em; line-height: 1.5; color: #ddd; }
                .kp-modal-text hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0; }
            `;
            document.head.appendChild(style);
        }

        // ⚙️ НАСТРОЙКИ ПЛАГИНА
        Lampa.SettingsApi.addComponent({
            component: "free_kp_extended",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>`,
            name: "Кинопоиск (API)",
        });

        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { type: "title" }, field: { name: "Авторизация" } });
        Lampa.SettingsApi.addParam({
            component: "free_kp_extended",
            param: { type: "button" },
            field: { name: "Ввести API Ключ", description: "Токен с сайта kinopoiskapiunofficial.tech" },
            onChange: function () {
                Lampa.Input.edit({ title: "Ввод ключа", value: Lampa.Storage.get("kp_unofficial_token", ""), free: true }, function (new_value) {
                    if (new_value) {
                        Lampa.Storage.set("kp_unofficial_token", new_value.trim());
                        Lampa.Noty.show("API Ключ успешно сохранен!");
                    }
                });
            },
        });

        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { type: "title" }, field: { name: "Отображение" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_slogan", type: "trigger", default: true }, field: { name: "Показывать слоган" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_similars", type: "trigger", default: true }, field: { name: "Похожие фильмы" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_facts", type: "trigger", default: true }, field: { name: "Интересные факты" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_bloopers", type: "trigger", default: true }, field: { name: "Ошибки (киноляпы)" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_awards", type: "trigger", default: true }, field: { name: "Награды" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_stills", type: "trigger", default: true }, field: { name: "Кадры" } });
        Lampa.SettingsApi.addParam({ component: "free_kp_extended", param: { name: "kp_show_posters", type: "trigger", default: true }, field: { name: "Постеры" } });

        // 🎬 ОСНОВНАЯ ЛОГИКА
        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            const token = Lampa.Storage.get("kp_unofficial_token", "");
            if (!token) return;

            // SCALPEL: Ищем элементы ТОЛЬКО на текущей странице фильма, а не во всем приложении
            const page = e.object.activity.render();
            const network = new Lampa.Reguest();
            const isTvShow = !!e.data.movie.name;
            const movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title;
            const movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || "").split("-")[0];

            Lampa.Noty.show(`Ищу «${movieTitle}» на Кинопоиске...`);

            // Прямой запрос без прокси (официально разрешен сервером KP API)
            function apiRequest(endpoint, successCall, errorCall) {
                network.silent(`https://kinopoiskapiunofficial.tech/api/${endpoint}`, successCall, errorCall, false, {
                    headers: { "X-API-KEY": token, "Content-Type": "application/json" },
                });
            }

            // Создание горизонтальной ленты СТРОГО внутри активной карточки
            function createSection(id, title) {
                if (page.find(`.${id}`).length > 0) return;
                const html = `
                    <div class="items-line layer--visible layer--render ${id}">
                        <div class="items-line__head"><div class="items-line__title">${title}</div></div>
                        <div class="items-line__body">
                            <div class="scroll scroll--horizontal">
                                <div class="scroll__content"><div class="scroll__body full-reviews ${id}-items" style="padding-top:10px; padding-bottom:15px;"></div></div>
                            </div>
                        </div>
                    </div>`;
                
                const target = page.find('.items-line').last();
                if (target.length) target.after(html);
                else page.find('.full-start-new__details, .full-start__details').append(html);
            }

            function loadMainInfo(kp_id) {
                apiRequest(`v2.2/films/${kp_id}`, (json) => {
                    if (json?.slogan && json.slogan !== "-" && page.find('.kp-slogan').length === 0) {
                        const sloganHtml = `<div class="kp-slogan">&laquo;${json.slogan}&raquo;</div>`;
                        const desc = page.find('.full-start-new__description, .full-start__description');
                        if (desc.length) desc.before(sloganHtml);
                        else page.find('.full-start-new__details').append(sloganHtml);
                    }
                });
            }

            function loadSimilars(kp_id) {
                apiRequest(`v2.2/films/${kp_id}/similars`, (json) => {
                    if (json?.items?.length) {
                        page.find('.items-line__title').filter(function() {
                            const t = $(this).text().toLowerCase();
                            return t.includes('рекомендуем') || t.includes('похожи') || t.includes('связанн');
                        }).closest('.items-line').hide();

                        createSection('kp-similars', 'Похожие (Кинопоиск)');
                        const itemsBlock = page.find('.kp-similars-items');
                        
                        json.items.forEach(sim => {
                            const name = sim.nameRu || sim.nameEn || sim.nameOriginal;
                            const poster = sim.posterUrlPreview || 'https://via.placeholder.com/130x195?text=Нет+постера';
                            const item = $(`
                                <div class="selector layer--visible kp-similar-wrap">
(function () {
    'use strict';

    function startPlugin() {
        if (window.free_kp_extended_ready) return;
        window.free_kp_extended_ready = true;

        // 🎨 ВНЕДРЕНИЕ ПРЕМИУМ-ДИЗАЙНА (Безопасный старый синтаксис)
        if ($('#kp-extended-css').length === 0) {
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

        // ⚙️ НАСТРОЙКИ ПЛАГИНА
        Lampa.SettingsApi.addComponent({
            component: 'free_kp_extended',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="M8 17l4 4 4-4"></path></svg>',
            name: 'Кинопоиск (API)'
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { type: 'title' }, field: { name: 'Авторизация' } });
        Lampa.SettingsApi.addParam({
            component: 'free_kp_extended',
            param: { type: 'button' },
            field: { name: 'Ввести API Ключ', description: 'Токен с сайта kinopoiskapiunofficial.tech' },
            onChange: function () {
                Lampa.Input.edit({ title: 'Ввод ключа', value: Lampa.Storage.get('kp_unofficial_token', ''), free: true }, function (new_value) {
                    if (new_value) {
                        Lampa.Storage.set('kp_unofficial_token', new_value.trim());
                        Lampa.Noty.show('API Ключ успешно сохранен!');
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { type: 'title' }, field: { name: 'Отображение' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_slogan', type: 'trigger', default: true }, field: { name: 'Показывать слоган' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_similars', type: 'trigger', default: true }, field: { name: 'Похожие фильмы' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_facts', type: 'trigger', default: true }, field: { name: 'Интересные факты' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_bloopers', type: 'trigger', default: true }, field: { name: 'Ошибки (киноляпы)' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_awards', type: 'trigger', default: true }, field: { name: 'Награды' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_stills', type: 'trigger', default: true }, field: { name: 'Кадры' } });
        Lampa.SettingsApi.addParam({ component: 'free_kp_extended', param: { name: 'kp_show_posters', type: 'trigger', default: true }, field: { name: 'Постеры' } });

        // 🎬 ОСНОВНАЯ ЛОГИКА
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' || !e.data || !e.data.movie) return;

            var token = Lampa.Storage.get('kp_unofficial_token', '');
            if (!token) return;

            // SCALPEL: Ищем элементы ТОЛЬКО на текущей странице фильма, а не во всем приложении
            var page = e.object.activity.render();
            var network = new Lampa.Reguest();
            var isTvShow = !!e.data.movie.name;
            var movieTitle = e.data.movie.name || e.data.movie.title || e.data.movie.original_title;
            var movieYear = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];

            Lampa.Noty.show('Ищу «' + movieTitle + '» на Кинопоиске...');

            // Прямой запрос без прокси
            function apiRequest(endpoint, successCall, errorCall) {
                network.silent('https://kinopoiskapiunofficial.tech/api/' + endpoint, successCall, errorCall, false, {
                    headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
                });
            }

            // Создание горизонтальной ленты СТРОГО внутри активной карточки
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
                                }, function() {
                                    Lampa.Activity.push({ component: 'search', query: name });
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

            function startFetching(kp_id) {
                Lampa.Noty.show('Данные Кинопоиска загружаются...');
                if (Lampa.Storage.get('kp_show_slogan', true)) loadMainInfo(kp_id);
                if (Lampa.Storage.get('kp_show_facts', true) || Lampa.Storage.get('kp_show_bloopers', true)) loadFactsAndBloopers(kp_id);
                if (Lampa.Storage.get('kp_show_similars', true)) loadSimilars(kp_id);
                if (Lampa.Storage.get('kp_show_awards', true)) loadAwards(kp_id);
                if (Lampa.Storage.get('kp_show_stills', true)) loadImages(kp_id, 'STILL', 'Кадры', 'kp-stills');
                if (Lampa.Storage.get('kp_show_posters', true)) loadImages(kp_id, 'POSTER', 'Постеры', 'kp-posters');
            }

            var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;
            if (kpid) {
                startFetching(kpid);
            } else {
                var query = encodeURIComponent(movieTitle + (movieYear ? ' ' + movieYear : ''));
                apiRequest('v2.1/films/search-by-keyword?keyword=' + query, function(searchJson) {
                    if (searchJson && searchJson.films && searchJson.films.length) {
                        startFetching(searchJson.films[0].filmId);
                    } else {
                        Lampa.Noty.show('Не найдено на Кинопоиске');
                    }
                }, function() {
                    console.log("KP Search error");
                });
            }
        });
    }

    if (window.Lampa) startPlugin();
    else {
        if (window.LampaListener) {
            window.LampaListener.follow("app", function(e) {
                if (e.type === "ready") startPlugin();
            });
        } else {
            setTimeout(startPlugin, 1000);
        }
    }
})();

                                    <img src="${poster}" class="kp-similar-poster" />
                                    <div class="kp-similar-title">${name}</div>
                                </div>
                            `);
                            
                            item.on('hover:enter', () => {
                                Lampa.Noty.show('Загрузка карточки...');
                                apiRequest(`v2.2/films/${sim.filmId}`, (details) => {
                                    if (details?.imdbId) Lampa.Activity.push({ url: '', component: 'full', id: details.imdbId, method: isTvShow ? 'tv' : 'movie', source: 'imdb' });
                                    else Lampa.Activity.push({ component: 'search', query: name });
                                }, () => Lampa.Activity.push({ component: 'search', query: name }));
                            });
                            itemsBlock.append(item);
                        });
                    }
                });
            }

            function loadFactsAndBloopers(kp_id) {
                apiRequest(`v2.2/films/${kp_id}/facts`, (json) => {
                    if (json?.items?.length) {
                        const facts = json.items.filter(f => f.type === 'FACT');
                        const bloopers = json.items.filter(f => f.type === 'BLOOPER');

                        function renderBlocks(dataList, containerClass, title, modalTitle) {
                            if (!dataList.length) return;
                            createSection(containerClass, title);
                            const itemsBlock = page.find(`.${containerClass}-items`);
                            
                            let fullTextHtml = '';
                            dataList.forEach(f => {
                                const clean = f.text.replace(/<[^>]+>/g, '');
                                const spoiler = f.spoiler ? `<span class="kp-spoiler">[СПОЙЛЕР]</span>` : '';
                                fullTextHtml += `${spoiler}${clean}<br><hr>`;
                            });

                            dataList.forEach(f => {
                                const clean = f.text.replace(/<[^>]+>/g, '');
                                const spoiler = f.spoiler ? `<span class="kp-spoiler">СПОЙЛЕР</span>` : '';
                                const preview = clean.length > 180 ? clean.substring(0, 180) + '...' : clean;
                                
                                const item = $(`
                                    <div class="full-review selector layer--visible type--line kp-review-card" style="width: 350px; margin-right: 15px;">
                                        <div class="full-review__text" style="font-size: 0.95em; line-height: 1.4;">${spoiler}${preview}</div>
                                    </div>
                                `);
                                
                                item.on('hover:enter', () => {
                                    Lampa.Modal.open({
                                        title: modalTitle,
                                        html: $(`<div class="broadcast__text kp-modal-text"><div class="otzyv">${fullTextHtml}</div></div>`),
                                        size: "large", mask: true, onBack: () => Lampa.Modal.close()
                                    });
                                });
                                itemsBlock.append(item);
                            });
                        }

                        if (Lampa.Storage.get('kp_show_facts', true)) renderBlocks(facts, 'kp-facts', 'Знаете ли вы, что...', 'Интересные факты');
                        if (Lampa.Storage.get('kp_show_bloopers', true)) renderBlocks(bloopers, 'kp-bloopers', `Ошибки в ${isTvShow ? 'сериале' : 'фильме'}`, 'Киноляпы');
                    }
                });
            }

            function loadAwards(kp_id) {
                apiRequest(`v2.2/films/${kp_id}/awards`, (json) => {
                    if (json?.items?.length) {
                        createSection('kp-awards', 'Награды');
                        const itemsBlock = page.find('.kp-awards-items');
                        json.items.forEach(a => {
                            const status = a.win ? '<span style="color:#79D29E; font-weight:bold;">🏆 Победа</span>' : '<span style="color:#bbb;">⭐ Номинация</span>';
                            itemsBlock.append($(`
                                <div class="full-review selector layer--visible type--line kp-review-card" style="min-width: 240px; margin-right: 15px;">
                                    <div class="full-review__text" style="line-height: 1.4;">${status}<br><b style="color:#fff;">${a.name} (${a.year})</b><br><span style="color:#aaa; font-size: 0.9em;">${a.nominationName}</span></div>
                                </div>
                            `));
                        });
