import {type NightwatchCustomCommandsModel} from 'nightwatch';
import {type MailHogItem} from "../types";

export default class MailHogGetEmail implements NightwatchCustomCommandsModel {
	async command(id: string): Promise<MailHogItem> {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		const response = await this
			.api
			.supertest
			.request(mailhogUrl)
			.get(`/v1/messages/${id}`)
			.set('Accept', 'text/json')
			.expect(200);

		return JSON.parse(response.text) as MailHogItem;
	}
}
