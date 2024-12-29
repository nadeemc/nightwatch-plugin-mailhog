import {type NightwatchCustomCommandsModel} from 'nightwatch';
import {type MailHogItem} from "../types";

export default class MailHogGetOneTimeCode implements NightwatchCustomCommandsModel {
	async command(query: string, kind: 'from' | 'to' | 'containing' = 'containing'): Promise<string> {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		const response = await this
			.api
			.supertest
			.request(mailhogUrl)
			.get(`/v2/search?limit=1&kind=${kind}&query=${query}`)
			.set('Accept', 'application/json')
			.expect(200);

		const emails = response.body.items as MailHogItem[] | undefined;
		if (!emails || emails.length === 0) {
			await browser.assert.fail('No emails found');
			return '';
		}

		// Parse the code
		const email = emails[0];
		const matches = /data-otp="one-time-code">(\d+)</.exec(email.Content.Body);
		if (!matches || matches.length < 2) {
			await browser.assert.fail('No code found in email; ensure the email contains a data-otp="one-time-code" element with the code.');
			return '';
		}

		return matches[1];
	}
}
