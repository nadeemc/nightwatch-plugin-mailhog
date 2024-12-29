import {type NightwatchCustomCommandsModel} from 'nightwatch';

export default class MailHogDeleteAllEmails implements NightwatchCustomCommandsModel {
	async command(): Promise<void> {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		await this
			.api
			.supertest
			.request(mailhogUrl)
			.delete('/v1/messages')
			.expect(200);
	}
}
