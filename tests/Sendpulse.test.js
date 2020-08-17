/* global describe test expect */
const path = require('path');
const { createApp, createKubik } =  require('rubik-main/tests/helpers/creators');

const { Kubiks: { Config } } = require('rubik-main');
const Esputnik = require('../classes/Esputnik');

const CONFIG_VOLUMES = [
  path.join(__dirname, '../default/'),
  path.join(__dirname, '../config/')
];

const get = () => {
  const app = createApp();
  app.add(new Config(CONFIG_VOLUMES));
  const kubik = createKubik(Esputnik, app);
  return { app, kubik };
}

describe('Кубик esputnik', () => {
  test('Создается и подключается в App без проблем', () => {
    const app = createApp();
    const kubik = createKubik(Esputnik, app);

    expect(app[kubik.name]).toBe(kubik);
    expect(app.get(kubik.name)).toBe(kubik);
  });

  test('Поднимается без ошибок', async () => {
    const { app } = get();
    await app.up();
    await app.down();
  });

  test('Получает информацию об аккаунте', async () => {
    const { app, kubik } = get();
    await app.up();

    const result = await kubik.makeReq({ path: 'account/info' });
    expect(result).toBeTruthy();
    expect(result.userEmail).toBeTruthy();
    expect(result.organisationName).toBeTruthy();

    await app.down();
  });

  test('Создает контакт', async () => {
    const { app, kubik } = get();
    await app.up();

    const result = await kubik.addContact({
      contacts: [{
        channels: [{
          type: 'email',
          value: 'ns1@indotech.ru',
        }],
        fields: {
          test: 'test',
          gender: 'м',
          birthday: '1990-10-10'
        }
      }]
    })

    expect(result).toBeTruthy();
    expect(result.asyncSessionId).toBeTruthy();

    await app.down();
  })

  test('Добавляет отписавшиеся emailы', async () => {
    const { app, kubik } = get();
    await app.up();

    await kubik.makeReq({
      path: 'emails/unsubscribed/add',
      method: 'POST',
      body: { emails: [ 'ns@indotech.ru' ] }
    })

    await app.down();
  })
});
