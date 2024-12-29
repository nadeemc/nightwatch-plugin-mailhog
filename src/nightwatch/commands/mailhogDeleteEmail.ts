import {type NightwatchCustomCommandsModel} from 'nightwatch';

export default class MailHogDeleteEmail implements NightwatchCustomCommandsModel {
	async command(id: string): Promise<void> {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		const response = await this
			.api
			.supertest
			.request(mailhogUrl)
			.delete(`/v1/messages/${id}`)
			.expect(200);
	}
}
