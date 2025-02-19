import type {
	CustomCommandInstance,
	NightwatchCustomCommandsModel,
} from 'nightwatch';
// eslint-disable-next-line import/no-unassigned-import
import '@nightwatch/apitesting';

export type MailHogItem = {
	ID: string;
	Content: {
		Body: string;
		Headers: {
			'Content-Transfer-Encoding'?: string[];
			'Content-Type'?: string[];
			Date?: string[];
			From?: string[];
			'Message-ID'?: string[];
			'Mime-Version'?: string[];
			Received?: string[];
			'Reply-To'?: string[];
			'Return-Path'?: string[];
			Subject: string[];
			To?: string[];
		};
		Size: number;
	};
	Created: string;
	From: {
		Mailbox: string;
		Domain: string;
	};
	To: {
		Mailbox: string;
		Domain: string;
	};
};

export type MailHogFindOptions = {
	kind?: 'from' | 'to' | 'containing';
	limit?: number;
	query: string;
	start?: number;
};

/**
 * The mailhog command gives you a single entry point to all MailHog-related functions:
 *    browser.mailhog().<functionName>()
 */
export default class MailHogCommand implements NightwatchCustomCommandsModel {
	public static autoInvoke = true;

	public command(this: CustomCommandInstance) {
		const {api} = this;
		const mailhogUrl = api.globals.mailhog;

		if (!mailhogUrl) {
			throw new Error(
				'globals.mailhog is empty; expected a URL to its API endpoint, e.g. http://localhost:4566/mailhog/api',
			);
		}

		// Our MailHog methods
		const methods = {
			deleteAllEmails() {
				return api.perform(async () => {
					await api.supertest
						.request(mailhogUrl)
						.delete('/v1/messages')
						.expect(200);
				});
			},

			deleteEmail(id: string) {
				return api.perform(async () => {
					await api.supertest
						.request(mailhogUrl)
						.delete(`/v1/messages/${encodeURIComponent(id)}`)
						.expect(200);
				});
			},

			async findEmails(
				queryOrOptions: string | MailHogFindOptions,
				callback: (items: MailHogItem[]) => void | Promise<void>,
			) {
				return api.perform(async () => {
					const options
						= typeof queryOrOptions === 'string'
						? {query: queryOrOptions}
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

					// Decode quoted-printable encoding if present
					for (const item of response.body.items) {
						const transferEncoding = item.Content.Headers['Content-Transfer-Encoding'];
						if (item.Content.Body && transferEncoding?.includes('quoted-printable')) {
							item.Content.Body = methods.decodeQuotedPrintable(item.Content.Body);
						}
					}

					await callback(response.body.items || []);
				});
			},

			async findMostRecentEmail(
				queryOrOptions: string | MailHogFindOptions,
				callback: (item: MailHogItem | undefined) => void | Promise<void>,
			) {
				const emails = await methods.performFindEmails(queryOrOptions);
				const sorted = methods.toSortedByDate(emails);
				await (sorted.length === 0 ? callback(undefined) : callback(sorted[0]));
			},

			getEmail(id: string, callback: (item: MailHogItem) => void | Promise<void>) {
				return api.perform(async () => {
					const response = await api.supertest
						.request(mailhogUrl)
						.get(`/v1/messages/${encodeURIComponent(id)}`)
						.set('Accept', 'text/json')
						.expect(200);

					// The MailHog v1/messages/<id> endpoint returns raw JSON text
					// so parse it and return the object
					const item = JSON.parse(response.text) as MailHogItem;
					// Decode quoted-printable encoding if present
					const transferEncoding = item.Content.Headers['Content-Transfer-Encoding'];
					if (item.Content.Body && transferEncoding?.includes('quoted-printable')) {
						item.Content.Body = methods.decodeQuotedPrintable(item.Content.Body);
					}

					await callback(item);
				});
			},

			getOneTimeCode(
				queryOrOptions: string | MailHogFindOptions,
				callback: (code: string) => void | Promise<void>,
			) {
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
					const options: MailHogFindOptions
						= typeof queryOrOptions === 'string'
						? ({
							...defaultOtpOptions,
							query: queryOrOptions,
						}) : ({
							...defaultOtpOptions,
							...queryOrOptions,
						});

					let emails: MailHogItem[] = [];
					await methods.findEmails(options, found => {
						emails = found;
					});

					if (emails.length === 0) {
						await api.assert.fail('No emails found matching that query.');
						await callback('');
						return;
					}

					let mostRecentEmail = emails[0];
					// Headers have been found to be more reliable than Created
					// because they are when the OTP email was sent, not when
					// it was received by MailHog.
					let mostRecentCreated = new Date(
						mostRecentEmail.Content.Headers.Date?.length
							? mostRecentEmail.Content.Headers.Date[0]
							: mostRecentEmail.Created,
					);

					for (const email of emails) {
						const created = new Date(
							email.Content.Headers.Date?.length
								? email.Content.Headers.Date[0]
								: email.Created,
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
						await callback('');
						return;
					}

					const code = matches[1];

					// 3) Delete the email so it can't be reused
					await methods.deleteEmail(emailId);
					await callback(code);
				});
			},

			async performFindEmails(queryOrOptions: string | MailHogFindOptions) {
				let result: MailHogItem[] = [];
				await methods.findEmails(queryOrOptions, items => {
					result = items;
				});
				return result;
			},
			async performFindMostRecentEmail(queryOrOptions: string | MailHogFindOptions) {
				let result: MailHogItem | undefined;
				await methods.findMostRecentEmail(queryOrOptions, item => {
					result = item;
				});
				return result;
			},
			async performGetEmail(id: string) {
				let result: MailHogItem | undefined;
				await methods.getEmail(id, item => {
					result = item;
				});
				return result;
			},
			async performGetOneTimeCode(queryOrOptions: string | MailHogFindOptions) {
				let result: string | undefined;
				await methods.getOneTimeCode(queryOrOptions, code => {
					result = code;
				});
				return result;
			},

			decodeQuotedPrintable(content: string) {
				// Based on https://www.npmjs.com/package/quoted-printable but
				// without adding it as a full dependency.
				return content
					// https://tools.ietf.org/html/rfc2045#section-6.7, rule 3:
					// “Therefore, when decoding a `Quoted-Printable` body, any trailing white
					// space on a line must be deleted, as it will necessarily have been added
					// by intermediate transport agents.”
					.replaceAll(/[\t ]$/gm, '')
					// Remove hard line breaks preceded by `=`. Proper `Quoted-Printable`-
					// encoded data only contains CRLF line  endings, but for compatibility
					// reasons we support separate CR and LF too.
					.replaceAll(/=(?:\r\n?|\n|$)/g, '')
					// Decode escape sequences of the form `=XX` where `XX` is any
					// combination of two hexidecimal digits. For optimal compatibility,
					// lowercase hexadecimal digits are supported as well. See
					// https://tools.ietf.org/html/rfc2045#section-6.7, note 1.
					.replaceAll(/=([a-fA-F\d]{2})/g, ($0, $1) => {
						const codePoint = Number.parseInt($1, 16);
						return String.fromCodePoint(codePoint);
					});
			},

			toSortedByDate(items: MailHogItem[]) {
				if (items.length === 0) {
					return items;
				}

				return items.sort((a, b) => {
					const aDate = new Date(
						a.Content.Headers.Date?.length
							? a.Content.Headers.Date[0]
							: a.Created,
					);
					const bDate = new Date(
						b.Content.Headers.Date?.length
							? b.Content.Headers.Date[0]
							: b.Created,
					);

					return aDate.getTime() - bDate.getTime();
				});
			},
		};

		return methods;
	}
}
