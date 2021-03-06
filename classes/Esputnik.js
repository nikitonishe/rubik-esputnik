const { Kubik } = require('rubik-main');
const fetch = require('node-fetch');
const set = require('lodash/set');

const EsputnikError = require('../errors/Esputnik');
const methods = require('./Esputnik/methods');

const DEFAULT_HOST = 'https://esputnik.com';

/**
 * The Esputnik kubik for the Rubik
 * @class
 * @prop {String} id account id
 * @prop {String} secret acount secret
 * @prop {String} host the senpulse's API host
 * @prop {String} token Bearer token
 * @prop {Date}   tokenExpiresAt Date object of token expiration
 */
class Esputnik extends Kubik {
  constructor(options) {
    super(...arguments);

    if (!options) options = {};
    this.version = options.version || null;
    this.username = options.username || null;
    this.password = options.password || null;
    this.host = options.host || null;

    this.token = null;
    this.methods.forEach(this.generateMethod, this);
  }

  /**
   * Добавляет контакт. Приводит contactFields, customFieldsIDs и fields внутри contact
   * к нужному виду. Остальные поля можно посмотреть в документации https://esputnik.com/api/el_ns0_contactsBulkUpdate.html
   * @param  {Object}  options Параметры контакта
   * @return {Object}          Ответ от апи
   */
  async addContact(options) {
    if (!(options.contacts && options.contacts.length)) {
      throw new EsputnikError('contacts is required');
    }

    // По умолчанию уникальность строится по id контакта
    if (!options.dedupeOn) options.dedupeOn = 'email';

    // Автоматически формируем массивы обновляемых полей контакта и обновляемых
    // дополнительных полей
    const contactFields = new Set();
    const customFieldsIDs = new Set();
    const dictionary = this.dictionaries.default
    options.contacts = options.contacts.map(elem => {
      return this.parseContact(elem, { dictionary, contactFields, customFieldsIDs });
    });

    // Если массив обновляемых полей контакта не определен то подставляем автоматически сформированный
    if (!(options.contactFields && options.contactFields.length) && contactFields.size) {
      options.contactFields = Array.from(contactFields);
    }

    // Если массив обновляемых дополнительны полей не определен то подставляем автоматически сформированный
    if (!(options.customFieldsIDs && options.customFieldsIDs.length) && customFieldsIDs.size) {
      options.customFieldsIDs = Array.from(customFieldsIDs);
    }

    return this.contacts(options);
  }

  /**
   * Парсит контакт, автоматически дополняет contactFields и customFieldsIDs
   * исходя из переданных полей контакта
   * @param  {Object} contact        Параметры контакта. fields можно передать в виде объекта
   * или в виде массива как показано в документации https://esputnik.com/api/el_ns0_contactsBulkUpdate.html
   * customFieldsIDs и contactFields можно передать или они будут сгенерированы автоматически
   * @param  {Object} dictionary     Словарь, которые используется для формирования
   *                                 fields если это поле было передано объектом
   * @param  {Set} contactFields     Set обновляемых полей контакта. Так как он один на несколько контактов,
   *                                 при парсинге каждого контакта его дополняем
   * @param  {Set} customFieldsIDs    Set обновляемых дополнительных полей. Так как он один на несколько контактов.
   *                                 при парсинге каждого контакта его дополняем
   * @return {Object}                Измененный контакт. Вообще объект меняется на месте,ъ
   *                                 поэтому можно и не возвращать
   */
  parseContact(contact, { dictionary, contactFields, customFieldsIDs }) {
    const allContactFields = [
      'firstName', 'lastName', 'address', 'email', 'sms', 'mobilepush', 'webpush',
      'contactKey', 'ordersInfo', 'town', 'region', 'postcode', 'languageCode',
      'timeZone'
    ];

    // Добавляем в массив обновляемых полей контакта все поля, которые есть в опциях
    for (const key of allContactFields) {
      if (Object.prototype.hasOwnProperty.call(contact, key)) contactFields.add(key);
    }

    // Если полей нет то и парсить нечего
    if (!contact.fields) return contact;

    // Если поля в массиве значит считаем что они уже в нужном виде
    if (Array.isArray(contact.fields)) return contact;
    const parsedFields = [];

    // Формируем из объекта массив обновляемых полей с опорой на словарь из конфига
    for (const key of Object.keys(contact.fields)) {
      if (!dictionary[key]) continue;
      customFieldsIDs.add(+dictionary[key]);
      parsedFields.push({ id: +dictionary[key], value: contact.fields[key] });
    }

    contact.fields = parsedFields;

    return contact;
  }

  /**
   * Осуществляет запрос к Esputnik
   * @param  {String}         path   Путь запроса
   * @param  {String}         host   Хост. Если не указан будет взят из this
   * @param  {String}         token  Токен. Если не указан будет взяn из this
   * @param  {Object|String}  body   Тело запроса. Если объект, то преобразуется в JSON
   * @param  {String}         method Метод запроса. Если не указан и есть тело то будет POST, а если тела нет то GET
   * @param  {String}         id     id. Для некоторых методов в строке запроса указывается id пользователя
   * @return {Promise}
   */
  async request({ path, host, token, body, method, id }) {
    if (!token) token = this.token;

    const headers = { 'Authorization': `Basic ${token}` };
    if (body) {
      if (!method) method = 'POST';
      if (typeof(body) === 'object') {
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json; charset=UTF-8';
      }
    }
    if (!method) method = 'GET';

    const url = this.getUrl({ path, host, id });
    const res = await fetch(url, { method, body, headers });

    const resBody = await res.text();

    // При статусе 400 и выше возвращается текст ошибки а не json
    if (+res.status > 399) throw new EsputnikError(resBody);

    // Иногда возвращается JSON иногда нет, а обрабатывать как то надо.
    try {
      return JSON.parse(resBody);
    } catch (err) {
      return { result: resBody };
    }
  }

  getUrl({ path, host, id }) {
    if (!host) host = this.host;
    if (id) path = path.replace('{{id}}', id);
    return `${host}/api/${this.version}/${path}`;
  }

  up({ config }) {
    this.config = config;

    const options = config.get(this.name);

    this.version = this.version || options.version;
    this.username = this.username || options.username;
    this.password = this.password || options.password;
    this.host = this.host || options.host || DEFAULT_HOST;
    this.dictionaries = this.dictionaries || options.dictionaries;

    this.token = Buffer.from(`${this.username}:${this.password}`).toString('base64')
  }

  /**
   * Сгенерировать метод API
   *
   * Создает функцию для запроса к API, привязывает ее к текущему контексту
   * и кладет в семантичное имя внутри this.
   * В итоге он разбирет путь на части, и раскладывает его по семантичным объектам:
   * one/two/three -> this.one.two.three({});
   * @param  {String}  path путь запроса, без ведущего /: one/two/three
   */
  generateMethod({ kubikName, apiName, method }) {
    const apiMethod = (body, options) => {
      if (!options) options = {};
      const { host, token, id } = options;
      return this.request({ path: apiName, body, method, host, token, id });
    };
    set(this, kubikName, apiMethod);
  }
}

// Чтобы не создавать при каждой инициализации класса,
// пишем значения имени и зависимостей в протип
Esputnik.prototype.dependencies = Object.freeze(['config']);
Esputnik.prototype.methods = Object.freeze(methods);
Esputnik.prototype.name = 'esputnik';

module.exports = Esputnik;
