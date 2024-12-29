import {type NightwatchCustomCommandsModel} from 'nightwatch';
import {type MailHogItem} from "../types";

export default class MailHogFindEmails implements NightwatchCustomCommandsModel {
	async command(query: string, limit = 1, start = 0, kind: 'from' | 'to' | 'containing' = 'containing'): Promise<MailHogItem[]> {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		const response = await this
			.api
			.supertest
			.request(mailhogUrl)
			.get(`/v2/search?limit=${limit}&kind=${kind}&query=${query}`)
			.set('Accept', 'application/json')
			.expect(200);

		return response.body.items as MailHogItem[];
	}
}
