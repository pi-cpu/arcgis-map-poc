(function () {
    'use strict';

    var validation = window.ArcGisPocValidation;
    var config = window.ArcGisPocConfig || { allowedParentOrigins: [] };
    var CONFIG_TIMEOUT_MS = 8000;

    var trustedParentOrigin = null;
    var sessionNonce = null;
    var view = null;
    var featureLayer = null;

    var statusEl = document.getElementById('status');

    function setStatus(message) {
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function postToParent(message) {
        if (window.parent === window) {
            return;
        }
        if (trustedParentOrigin) {
            window.parent.postMessage(message, trustedParentOrigin);
            return;
        }
        config.allowedParentOrigins.forEach(function (origin) {
            window.parent.postMessage(message, origin);
        });
    }

    function sendError(code) {
        postToParent(validation.buildErrorMessage(code));
    }

    function handleParentMessage(event) {
        if (window.parent === window || event.source !== window.parent) {
            return;
        }
        if (!validation.isAllowedOrigin(event.origin, config.allowedParentOrigins)) {
            return;
        }
        var data = event.data;
        if (!validation.isValidConfigMessage(data)) {
            return;
        }
        if (trustedParentOrigin) {
            // 設定は初回のみ受け付ける
            return;
        }
        trustedParentOrigin = event.origin;
        sessionNonce = data.nonce;
        initializeMap(data.apiKey, data.layerUrl);
    }

    function initializeMap(apiKey, layerUrl) {
        setStatus('地図を読み込み中...');
        window.require(
            ['esri/config', 'esri/Map', 'esri/views/MapView', 'esri/layers/FeatureLayer'],
            function (esriConfig, EsriMap, MapView, FeatureLayer) {
                esriConfig.apiKey = apiKey;

                featureLayer = new FeatureLayer({ url: layerUrl });
                featureLayer.load().catch(function (err) {
                    sendError('LAYER_UNAVAILABLE');
                    // 一時的な切り分け用: ArcGIS側の失敗理由をiframe内にだけ表示する。
                    // 親へは非機密のエラーコードのみを送る方針は変えない。原因特定後に元へ戻すこと。
                    var detail = err && (err.name || '') + ' ' + (err.message || '');
                    setStatus('地図データを読み込めませんでした。[診断] ' + detail);
                });

                var map = new EsriMap({
                    basemap: 'arcgis-topographic',
                    layers: [featureLayer]
                });

                view = new MapView({
                    container: 'mapView',
                    map: map,
                    zoom: 4,
                    center: [138, 38]
                });

                view.when(
                    function () {
                        setStatus('地点をクリックして選択してください。');
                    },
                    function () {
                        sendError('API_KEY_INVALID');
                        setStatus('地図サービスへの接続に失敗しました。');
                    }
                );

                view.on('click', function (mapEvent) {
                    view.hitTest(mapEvent).then(function (response) {
                        var results = response.results || [];
                        var match;
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].graphic && results[i].graphic.layer === featureLayer) {
                                match = results[i].graphic;
                                break;
                            }
                        }
                        if (match) {
                            handleFeatureClick(match);
                        }
                    });
                });
            },
            function () {
                sendError('UNKNOWN');
                setStatus('地図の初期化に失敗しました。');
            }
        );
    }

    function handleFeatureClick(graphic) {
        var attrs = graphic.attributes || {};
        var point = graphic.geometry;
        var feature = {
            featureKey: attrs.feature_key,
            name: attrs.name,
            address: attrs.address,
            phone: attrs.phone,
            website: attrs.website,
            latitude: point ? point.latitude : undefined,
            longitude: point ? point.longitude : undefined
        };
        if (!validation.isValidFeatureAttributes(feature)) {
            sendError('UNKNOWN');
            return;
        }
        postToParent(validation.buildFeatureSelectedMessage(sessionNonce, feature));
    }

    window.addEventListener('message', handleParentMessage);

    window.addEventListener('DOMContentLoaded', function () {
        if (window.parent === window) {
            setStatus('このアプリはSalesforce Experience Cloudのページに埋め込んで使用してください。');
            return;
        }
        if (!config.allowedParentOrigins.length) {
            setStatus('許可された埋め込み元が未設定です。管理者へ連絡してください。');
            return;
        }
        setStatus('設定を待機しています...');
        postToParent(validation.buildReadyMessage());

        window.setTimeout(function () {
            if (!trustedParentOrigin) {
                setStatus('地図の設定を読み込めませんでした。');
                sendError('CONFIG_MISSING');
            }
        }, CONFIG_TIMEOUT_MS);
    });
})();
