import type {
	CustomCommandInstance,
	NightwatchCustomCommandsModel,
} from 'nightwatch';
import { MailHogFindOptions, MailHogItem } from '../types';
import '@nightwatch/apitesting';

/**
 * The mailhog command gives you a single entry point to all MailHog-related functions:
 *    browser.mailhog().<functionName>()
 */
export default class MailhogCommand implements NightwatchCustomCommandsModel {
	public static autoInvoke = true;

	public command(this: CustomCommandInstance) {
		const { api } = this;
		const mailhogUrl = api.globals.mailhog;

		if (!mailhogUrl) {
			throw new Error(
				'globals.mailhog is empty; expected a URL to its API endpoint, e.g. http://localhost:4566/mailhog/api'
			);
		}

		// Our MailHog methods
		const methods = {
			/**
			 * Deletes all emails in the MailHog inbox.
			 */
			deleteAllEmails: () => {
				return api.perform(() => {
					api.supertest
						.request(mailhogUrl)
						.delete('/v1/messages')
						.expect(200);
				});
			},

			/**
			 * Deletes a specific email in the MailHog inbox.
			 */
			deleteEmail: (id: string) => {
				return api.perform(() => {
					api.supertest
						.request(mailhogUrl)
						.delete(`/v1/messages/${encodeURIComponent(id)}`)
						.expect(200);
				});
			},

			/**
			 * Finds messages in the MailHog inbox.
			 */
			findEmails: async (
				queryOrOptions: string | MailHogFindOptions,
				callback: (items: MailHogItem[]) => void
			) => {
				return api.perform(async () => {
					const options =
						typeof queryOrOptions === 'string'
							? { query: queryOrOptions }
							: queryOrOptions;
					const {
						kind = 'containing',
						limit = 10,
						query,
						start = 0,
					} = options;

					const response = await api.supertest
						.request(mailhogUrl)
						.get(`/v2/search?limit=${limit}&start=${start}&kind=${kind}&query=${query}`)
						.set('Accept', 'application/json')
						.expect(200);

					callback(response.body.items || []);
				});
			},

			/**
			 * Retrieves a specific email in the MailHog inbox by its ID.
			 */
			getEmail: (id: string, callback: (item: MailHogItem) => void) => {
				return api.perform(async () => {
					const response = await api.supertest
						.request(mailhogUrl)
						.get(`/v1/messages/${encodeURIComponent(id)}`)
						.set('Accept', 'text/json')
						.expect(200);

					// The MailHog v1/messages/<id> endpoint returns raw JSON text
					// so parse it and return the object
					callback(JSON.parse(response.text) as MailHogItem);
				});
			},

			/**
			 * Retrieves a one-time code from the MailHog inbox by searching
			 * for an email, parses it, and then deletes that email.
			 * Expects an element like: <code data-otp="one-time-code">123456</code> in the body.
			 * @param queryOrOptions The query string or options to find the email.
			 *  If a string, it is treated as a 'to' email address query by default.
			 */
			getOneTimeCode: (
				queryOrOptions: string | MailHogFindOptions,
				callback: (code: string) => void
			) => {
				return api.perform(async () => {
					// 1) Find the latest matching email
					const defaultOtpOptions: Omit<MailHogFindOptions, 'query'> = {
						kind: 'to',
						// There is no sort option, so we retrieve a
						// batch and then sort it ourselves within
						// the response logic. This ensures if multiple
						// emails were sent, we get the latest one.
						limit: 20,
						start: 0,
					};
					const options: MailHogFindOptions =
						typeof queryOrOptions === 'string' ?
							({
								...defaultOtpOptions,
								query: queryOrOptions
							}) : ({
								...defaultOtpOptions,
								...queryOrOptions,
							});

					let emails: MailHogItem[] = [];
					await methods.findEmails(options, (found) => {
						emails = found;
					});

					if (!emails.length) {
						await api.assert.fail('No emails found matching that query.');
						callback('');
						return;
					}

					let mostRecentEmail = emails[0];
					// Headers have been found to be more reliable than Created
					// because they are when the OTP email was sent, not when
					// it was received by MailHog.
					let mostRecentCreated = new Date(
						Boolean(mostRecentEmail.Content.Headers.Date?.length) ?
						mostRecentEmail.Content.Headers.Date[0] :
						mostRecentEmail.Created
					);

					for (const email of emails) {
						let created = new Date(
							Boolean(email.Content.Headers.Date?.length) ?
							email.Content.Headers.Date[0] :
							email.Created
						);
						if (created.getTime() > mostRecentCreated.getTime()) {
							mostRecentEmail = email;
							mostRecentCreated = created;
						}
					}

					const emailId = mostRecentEmail.ID;
					const body = mostRecentEmail.Content.Body || '';

					// 2) Extract the one-time code
					//    Example snippet: <code data-otp="one-time-code">123456</code>
					const matches = /data-otp="one-time-code"\s*>(\d+)</.exec(body);
					if (!matches || matches.length < 2) {
						await api.assert.fail('No code found in email (data-otp="one-time-code").');
						callback('');
						return;
					}

					const code = matches[1];

					// 3) Delete the email so it can't be reused
					await methods.deleteEmail(emailId);

					callback(code);
				});
			},
		};

		return methods;
	}
}
