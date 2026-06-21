(function () {
    "use strict";

    var kp_token = "";

    function runPlugin() {
        if (!window.Lampa) return;

        Lampa.Listener.follow("full", function (e) {
            if (e.type !== "complite" || !e.data || !e.data.movie) return;

            var $ = window.$ || window.jQuery;
            if (!$) return;

            $(".button--kp-main-plus").remove();

            var btn = $('<div class="full-start__button selector button--kp-main-plus" style="background: rgba(255,102,0,0.15); border: 1px solid #f60; margin-right: 10px;"><span style="color:#f60; font-weight:bold;">✨ Кинопоиск+</span></div>');
            
            var btnContainer = $(".full-start-new__buttons").length ? $(".full-start-new__buttons") : $(".full-start__buttons");
            if (btnContainer.length) btnContainer.append(btn);

            btn.on("hover:enter", function () {
                var token = Lampa.Storage.get('kp_unofficial_token', '');
                if (!token) {
                    Lampa.Input.edit({ title: 'Введи API Ключ Кинопоиска', value: '', free: true }, function (new_val) {
                        if (new_val) {
                            Lampa.Storage.set('kp_unofficial_token', new_val.trim());
                            Lampa.Noty.show('Ключ сохранен!');
                        }
                    });
                    return;
                }

                kp_token = token;
                var title = e.data.movie.name || e.data.movie.title || e.data.movie.original_title || '';
                var kpid = e.data.movie.kinopoisk_id || e.data.movie.kp_id || e.data.movie.id_kp;

                if (kpid) {
                    openInfo(kpid);
                } else {
                    Lampa.Noty.show('Поиск ID...');
                    var net = new Lampa.Reguest();
                    net.silent('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title), function(json) {
                        if (json.films && json.films.length > 0) {
                            openInfo(json.films[0].filmId);
                        } else {
                            Lampa.Noty.show('Не найдено');
                        }
                    }, function() { Lampa.Noty.show('Ошибка API'); }, false, { headers: { 'X-API-KEY': token } });
                }
            });
        });
    }

    function openInfo(id) {
        var net = new Lampa.Reguest();
        net.silent('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + id + '/facts', function(json) {
            if (json.items && json.items.length > 0) {
                Lampa.Noty.show(json.items[0].text.substring(0, 100) + '...');
            } else {
                Lampa.Noty.show('Информации нет');
            }
        }, function() { Lampa.Noty.show('Ошибка данных'); }, false, { headers: { 'X-API-KEY': kp_token } });
    }

    if (window.Lampa) runPlugin();
    else window.addEventListener('appfiles', runPlugin);
})();
