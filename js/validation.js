(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ArcGisPocValidation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    var MESSAGE_VERSION = 1;
    var MAX_TEXT_LENGTH = 255;
    var MAX_KEY_LENGTH = 100;
    var MAX_API_KEY_LENGTH = 512;
    var MAX_URL_LENGTH = 1024;
    var MAX_NONCE_LENGTH = 128;
    var LAT_MIN = -90;
    var LAT_MAX = 90;
    var LNG_MIN = -180;
    var LNG_MAX = 180;

    function isAllowedOrigin(origin, allowedOrigins) {
        return Array.isArray(allowedOrigins) && allowedOrigins.indexOf(origin) !== -1;
    }

    function isValidRequiredString(value, maxLength) {
        return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
    }

    function isValidOptionalString(value, maxLength) {
        if (value === undefined || value === null) {
            return true;
        }
        return typeof value === 'string' && value.length <= maxLength;
    }

    function isValidConfigMessage(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        if (data.type !== 'arcgis-map-config') {
            return false;
        }
        if (data.version !== MESSAGE_VERSION) {
            return false;
        }
        if (!isValidRequiredString(data.apiKey, MAX_API_KEY_LENGTH)) {
            return false;
        }
        if (!isValidRequiredString(data.layerUrl, MAX_URL_LENGTH) || data.layerUrl.indexOf('https://') !== 0) {
            return false;
        }
        if (!isValidRequiredString(data.nonce, MAX_NONCE_LENGTH)) {
            return false;
        }
        return true;
    }

    function isValidFeatureAttributes(attrs) {
        if (!attrs || typeof attrs !== 'object') {
            return false;
        }
        if (!isValidRequiredString(attrs.featureKey, MAX_KEY_LENGTH)) {
            return false;
        }
        if (!isValidRequiredString(attrs.name, MAX_TEXT_LENGTH)) {
            return false;
        }
        if (!isValidOptionalString(attrs.address, MAX_TEXT_LENGTH)) {
            return false;
        }
        if (!isValidOptionalString(attrs.phone, MAX_TEXT_LENGTH)) {
            return false;
        }
        if (!isValidOptionalString(attrs.website, MAX_TEXT_LENGTH)) {
            return false;
        }
        if (typeof attrs.latitude !== 'number' || Number.isNaN(attrs.latitude) || attrs.latitude < LAT_MIN || attrs.latitude > LAT_MAX) {
            return false;
        }
        if (typeof attrs.longitude !== 'number' || Number.isNaN(attrs.longitude) || attrs.longitude < LNG_MIN || attrs.longitude > LNG_MAX) {
            return false;
        }
        return true;
    }

    function buildReadyMessage() {
        return { type: 'arcgis-map-ready', version: MESSAGE_VERSION };
    }

    function buildFeatureSelectedMessage(nonce, feature) {
        return { type: 'arcgis-feature-selected', version: MESSAGE_VERSION, nonce: nonce, feature: feature };
    }

    function buildErrorMessage(code) {
        return { type: 'arcgis-map-error', version: MESSAGE_VERSION, code: code };
    }

    return {
        MESSAGE_VERSION: MESSAGE_VERSION,
        isAllowedOrigin: isAllowedOrigin,
        isValidConfigMessage: isValidConfigMessage,
        isValidFeatureAttributes: isValidFeatureAttributes,
        buildReadyMessage: buildReadyMessage,
        buildFeatureSelectedMessage: buildFeatureSelectedMessage,
        buildErrorMessage: buildErrorMessage
    };
});
