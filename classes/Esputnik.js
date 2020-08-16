const { Kubik } = require('rubik-main');
const fetch = require('node-fetch');

const EsputnikError = require('../errors/Esputnik');

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
  }

  /**
   * Добавляет контакт. Приводит contactFields, customFieldIds и fields внутри contact
   * к нужному виду. Остальные поля можно посмотреть в документации https://esputnik.com/api/el_ns0_contactsBulkUpdate.html
   * @param  {Object}  options Параметры контакта
   * @return {Object}          Ответ от апи
   */
  async addContact(options) {
    if (!(options.contacts && options.contacts.length)) {
      throw new EsputnikError('contacts is required');
    }

    // По умолчанию уникальность строится по id контакта
    if (!options.dedupeOn) options.dedupeOn = 'id';

    // Автоматически формируем массивы обновляемых полей контакта и обновляемых
    // дополнительных полей
    const contactFields = new Set();
    const customFieldIds = new Set();
    const dictionary = this.dictionaries.default
    options.contacts = options.contacts.map(elem => {
      return this.parseContact(elem, { dictionary, contactFields, customFieldIds });
    });

    // Если массив обновляемых полей контакта не определен то подставляем автоматически сформированный
    if (!(options.contactFields && options.contactFields.length)) {
      options.contactFields = Array.from(contactFields);
    }

    // Если массив обновляемых дополнительны полей не определен то подставляем автоматически сформированный
    if (!(options.customFieldIds && options.customFieldIds.length)) {
      options.customFieldIds = Array.from(customFieldIds);
    }

    return this.makeReq({ path: 'contacts', method: 'POST', body: options });
  }

  /**
   * Парсит контакт, автоматически дополняет contactFields и customFieldIds
   * исходя из переданных полей контакта
   * @param  {Object} contact        Параметры контакта. fields можно передать в виде объекта
   * или в виде массива как показано в документации https://esputnik.com/api/el_ns0_contactsBulkUpdate.html
   * customFieldIds и contactFields можно передать или они будут сгенерированы автоматически
   * @param  {Object} dictionary     Словарь, которые используется для формирования
   *                                 fields если это поле было передано объектом
   * @param  {Set} contactFields     Set обновляемых полей контакта. Так как он один на несколько контактов,
   *                                 при парсинге каждого контакта его дополняем
   * @param  {Set} customFieldIds    Set обновляемых дополнительных полей. Так как он один на несколько контактов.
   *                                 при парсинге каждого контакта его дополняем
   * @return {Object}                Измененный контакт. Вообще объект меняется на месте,ъ
   *                                 поэтому можно и не возвращать
   */
  parseContact(contact, { dictionary, contactFields, customFieldIds }) {
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
      customFieldIds.add(dictionary[key]);
      parsedFields.push({ id: dictionary[key], value: contact.fields[key] });
    }

    contact.fields = parsedFields;

    return contact;
  }

  async makeReq({ path, method, body }) {
    if (!method) method = 'GET';

    const url = `${this.host}/api/${this.version}/${path}`;
    if (method !== 'GET' && typeof(body) === 'object') body = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': `Basic ${this.token}`
    }

    const res = await fetch(url, { method, body, headers });

    if (+res.status > 399) {
      const errorText = await res.text();
      throw new EsputnikError(errorText);
    }

    // Иногда возвращается JSON иногда нет, а обрабатывать как то надо.
    const resBody = await res.text();
    try {
      return JSON.parse(resBody);
    } catch (err) {
      return { result: resBody };
    }
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
}


Esputnik.prototype.name = 'esputnik';
Esputnik.prototype.dependencies = Object.freeze(['config']);

module.exports = Esputnik;
