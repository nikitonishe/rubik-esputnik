# rubik-esputnik
Esputnik's Bot API kubik for the Rubik

## Install

### npm
```bash
npm i rubik-esputnik
```

### yarn
```bash
yarn add rubik-esputnik
```

## Use
```js
const { App, Kubiks } = require('rubik-main');
const Esputnik = require('rubik-esputnik');
const path = require('path');

// create rubik app
const app = new App();
// config need for most modules
const config = new Kubiks.Config(path.join(__dirname, './config/'));

const esputnik = new Esputnik();

app.add([ config, esputnik ]);

app.up().
then(() => console.info('App started')).
catch(err => console.error(err));
```

## Config
`esputnik.js` config example

module.exports = {
  host: 'https://esputnik.com/', // host
  version: 'v1', // api version
  username: 'username', // any value
  password: 'password', // api key

  dictionaries: {
    default: { // matching the names of the fields passed to addContact and their id in esputnik
      birthday: '157725',
      gender: '157726',
      test: '157938'
    }
  }
};

```

## Call

```js
...
const response = await app.esputnik.makeReq({ path: 'account/info' });
...
const createResponse = await app.esputnik.addContact({
  contacts: [{
    channels: [{
      type: 'email',
      value: 'example@example.com',
    }],
    fields: {
      test: 'test',
      gender: 'м',
      birthday: '1990-10-10'
    }
  }]
});
````

## Extensions
Esputnik kubik doesn't has any extension.
