# nightwatch-plugin-mailhog
A TypeScript based [@nightwatchjs](https://github.com/nightwatchjs/nightwatch) plugin for interacting with, and asserting on, data within a [@mailhog](https://github.com/mailhog/MailHog) instance.

# Installation
```shell
npm install nightwatch-plugin-mailhog --save-dev
```

# Configuration
Include the plugin, and its dependency on the `@nightwatchjs/apitesting` plugin, in your `nightwatch.conf.js` file.
```js
plugins: ['@nightwatch/apitesting', 'nightwatch-plugin-mailhog']
// If you don't already have a global variables file, create one.
globals_path: 'nightwatch/globals.ts'
```

Define your `mailhog` API endpoint within your global variables file:

```ts
import {NightwatchGlobals} from 'nightwatch';

const globals: NightwatchGlobals = {
	mailhog: 'http://localhost:4566/mailhog/api',
};
export default globals;
```

# Example Usage

```ts
import {type NightwatchTests} from 'nightwatch';
// Import type definition to enable intellisense for mailhog commands.
import 'nightwatch-plugin-mailhog';

const email: NightwatchTests = {
	async 'can retrieve messages'() {
		// Because this is using 0 for the check, it only confirms that the
		// MailHog API returns a 200 status code from the request.
		await browser.assert.mailhogInboxCount(0, 'greaterThanOrEqual');
	},

	async 'find by keyword and id'() {
		let email: MailHogItem | undefined = undefined;
		
		await browser.mailhog().findEmails('Subject, body, or recipient', items => {
			if (items.length > 0) {
				email = items[0];
			}
		});
		
		await browser.assert.ok(email !== undefined);
		await browser.assert.ok(email.Content.Body.includes('Some keywords'));
		await browser.assert.ok(email.Content.Headers.Subject[0].includes('Some keywords'));

		await browser.mailhog().getEmail(email.ID, found => {
			browser.assert.strictEqual(found.ID, email.ID);
		});
	},

	async 'retrieve one-time-password and delete'() {
		let otpCode: string | undefined = undefined;
		await browser.mailhog().getOneTimeCode('Your OTP subject', code => {
			otpCode = code;
		});
		await browser.assert.ok(otpCode);
	},

	async 'delete all messages'() {
		await browser.mailhog().deleteAllEmails();
	},
};

export default email;
```
