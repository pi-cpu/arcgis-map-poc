const { test } = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../js/validation.js');

const ALLOWED_ORIGINS = ['https://example.my.site.com'];

const VALID_CONFIG = {
    type: 'arcgis-map-config',
    version: 1,
    apiKey: 'test-api-key',
    layerUrl: 'https://example.com/arcgis/rest/services/Locations/FeatureServer/0',
    nonce: 'test-nonce-12345'
};

const VALID_FEATURE = {
    featureKey: 'SAMPLE-001',
    name: 'サンプル図書館',
    address: '東京都千代田区丸の内1-1-1',
    phone: '03-0000-0001',
    website: 'https://example.com/sample-library',
    latitude: 35.6812,
    longitude: 139.7671
};

test('FeatureLayerで取得する属性を連携契約の5項目だけに限定する', () => {
    assert.deepEqual(validation.FEATURE_OUT_FIELDS, ['feature_key', 'name', 'address', 'phone', 'website']);
});

test('isAllowedOrigin: 許可された親オリジンのみtrueを返す', () => {
    assert.equal(validation.isAllowedOrigin('https://example.my.site.com', ALLOWED_ORIGINS), true);
    assert.equal(validation.isAllowedOrigin('https://evil.example', ALLOWED_ORIGINS), false);
    assert.equal(validation.isAllowedOrigin('https://example.my.site.com', []), false);
    assert.equal(validation.isAllowedOrigin('https://example.my.site.com', undefined), false);
});

test('isValidConfigMessage: 正しいarcgis-map-configメッセージを受理する', () => {
    assert.equal(validation.isValidConfigMessage(VALID_CONFIG), true);
});

test('isValidConfigMessage: バージョン不一致を拒否する', () => {
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, version: 2 }), false);
});

test('isValidConfigMessage: 種別不一致を拒否する', () => {
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, type: 'arcgis-map-ready' }), false);
});

test('isValidConfigMessage: APIキー欠如(設定不足)を拒否する', () => {
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, apiKey: '' }), false);
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, apiKey: undefined }), false);
});

test('isValidConfigMessage: レイヤーURL欠如・非https(設定不足)を拒否する', () => {
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, layerUrl: '' }), false);
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, layerUrl: 'http://example.com/layer' }), false);
});

test('isValidConfigMessage: 無効なnonce(空文字・型不正・長すぎる)を拒否する', () => {
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, nonce: '' }), false);
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, nonce: 12345 }), false);
    assert.equal(validation.isValidConfigMessage({ ...VALID_CONFIG, nonce: 'a'.repeat(200) }), false);
});

test('isValidConfigMessage: nullや配列などの不正な形状を拒否する', () => {
    assert.equal(validation.isValidConfigMessage(null), false);
    assert.equal(validation.isValidConfigMessage('not-an-object'), false);
    assert.equal(validation.isValidConfigMessage([]), false);
});

test('isValidFeatureAttributes: 正しい地点属性を受理する', () => {
    assert.equal(validation.isValidFeatureAttributes(VALID_FEATURE), true);
});

test('isValidFeatureAttributes: featureKey欠如を拒否する', () => {
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, featureKey: '' }), false);
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, featureKey: 'a'.repeat(101) }), false);
});

test('isValidFeatureAttributes: 緯度・経度の範囲外を拒否する', () => {
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, latitude: 999 }), false);
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, latitude: -91 }), false);
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, longitude: 181 }), false);
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, longitude: -181 }), false);
});

test('isValidFeatureAttributes: 緯度・経度の型不正を拒否する', () => {
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, latitude: '35.6812' }), false);
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, longitude: null }), false);
});

test('isValidFeatureAttributes: 任意項目の文字列長超過を拒否する', () => {
    assert.equal(validation.isValidFeatureAttributes({ ...VALID_FEATURE, address: 'a'.repeat(256) }), false);
});

test('isValidFeatureAttributes: 任意項目の欠如は許容する', () => {
    const { address, phone, website, ...rest } = VALID_FEATURE;
    assert.equal(validation.isValidFeatureAttributes(rest), true);
});

test('buildReadyMessage: 契約通りのversion/typeを持つ', () => {
    const message = validation.buildReadyMessage();
    assert.deepEqual(message, { type: 'arcgis-map-ready', version: 1 });
});

test('buildFeatureSelectedMessage: nonceと地点情報を含む', () => {
    const message = validation.buildFeatureSelectedMessage('nonce-abc', VALID_FEATURE);
    assert.equal(message.type, 'arcgis-feature-selected');
    assert.equal(message.version, 1);
    assert.equal(message.nonce, 'nonce-abc');
    assert.deepEqual(message.feature, VALID_FEATURE);
});

test('buildErrorMessage: 非機密のエラーコードのみを含む', () => {
    const message = validation.buildErrorMessage('LAYER_UNAVAILABLE');
    assert.deepEqual(message, { type: 'arcgis-map-error', version: 1, code: 'LAYER_UNAVAILABLE' });
});
