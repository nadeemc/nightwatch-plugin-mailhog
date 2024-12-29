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

Define the `mailhog` API endpoint in your global variables file:
```ts
const globals = {
	mailhog: 'http://localhost:4566/mailhog/api',
};
export default globals;
```

# Example Usage

```ts
import {type NightwatchTests} from 'nightwatch';
// Import type definitions
import _ from 'nightwatch-plugin-mailhog';

const email: NightwatchTests = {
	async 'can retrieve messages'() {
		// Check for a 200 response from the Mailhog API, ignoring found messages
		await browser.assert.mailhogInboxCount('.com', 0, 'atLeast');
	},

	async 'find by keyword and id'() {
		const emails = await browser.mailhogFindEmails('Subject, body, or recipient');
		if (!emails || emails.length === 0) {
			await browser.assert.fail('No emails found');
		}

		const email = emails[0];
		await browser.assert.ok(email.Content.Body.includes('Some keywords'));
		await browser.assert.ok(email.Content.Headers.Subject[0].includes('Some keywords'));

		const found = await browser.mailhogGetEmail(email.ID);
		await browser.assert.strictEqual(found.ID, email.ID);
	},
	
	async 'retrieve one-time-password and delete'() {
		const otpCode = await browser.mailhogGetOneTimeCode('Your OTP subject');
		await browser.assert.ok(otp.length > 0);

		await browser.mailhogDeleteEmail(email.ID);
	},
	
	async 'delete all messages'() {
		await browser.mailhogDeleteAllEmails();
	},
};

export default email;
```
