export * from 'nightwatch';

export type MailHogItem = {
	ID: string;
	Content: {
		Body: string;
		Headers: {
			Date: string[] | undefined;
			Subject: string[];
		};
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

declare module 'nightwatch' {
	interface NightwatchAssertions {
		/**
		 * Asserts on the number of matching messages in the MailHog inbox.
		 * @param expected the expected number of messages
		 * @param comparison 'lessThanOrEqual' | 'greaterThanOrEqual' | 'equal' (default)
		 * @param query e.g. an email address or substring
		 * @param kind 'from' | 'to' | 'containing' (default)
		 */
		mailhogInboxCount: (expected: number, comparison?: 'lessThanOrEqual' | 'greaterThanOrEqual' | 'equal', query?: string, kind?: 'from' | 'to' | 'containing') => NightwatchAssertion<number>;
	}

	interface NightwatchCustomCommands {
		/**
		 * Access all Mailhog commands under browser.mailhog
		 */
		mailhog: () => {
			/**
			 * Deletes all emails in the MailHog inbox.
			 */
			deleteAllEmails: () => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Deletes a specific email in the MailHog inbox.
			 */
			deleteEmail: (id: string) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Finds messages in the MailHog inbox.
			 */
			findEmails: (queryOrOptions: string | MailHogFindOptions, callback: (items: MailHogItem[]) => void) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Retrieves a specific email in the MailHog inbox by its ID.
			 */
			getEmail: (id: string, callback: (item: MailHogItem) => void) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Retrieves a one-time code from the MailHog inbox by searching
			 * for an email, parses it, and then deletes that email.
			 * Expects an element like: <code data-otp="one-time-code">123456</code> in the body.
			 */
			getOneTimeCode: (queryOrOptions: string | MailHogFindOptions, callback: (code: string) => void) => Awaitable<NightwatchAPI, Error | null>;
		};
	}
};
