import {Assert, NightwatchAPI, NightwatchAssertion} from 'nightwatch';

export * from 'nightwatch';

export type MailHogItem = {
	Content: {
		Body: string;
		Headers: {
			Subject: string[];
		};
	};
	Created: Date;
	From: {
		Mailbox: string;
		Domain: string;
	};
	ID: string;
	To: {
		Mailbox: string;
		Domain: string;
	};
};

declare module 'nightwatch' {
	export interface NightwatchCustomCommands {
		// Deletes all messages in the MailHog inbox.
		mailhogDeleteAllEmails: () => Promise<void>;
		// Deletes a specific message in the MailHog inbox.
		mailhogDeleteEmail: (id: string) => Promise<void>;
		// Finds messages in the MailHog inbox.
		mailhogFindEmails: (query: string, limit?: number, start?: number, kind?: 'from' | 'to' | 'containing') => Promise<MailHogItem[]>;
		// Retrieve a specific message in the MailHog inbox.
		mailhogGetEmail: (id: string) => Promise<MailHogItem>;
		// Retrieve a one-time password from the MailHog inbox.
		// Expects the email to contain a <code data-otp="one-time-code"> element with the code.
		mailhogGetOneTimeCode: (query: string, kind?: 'from' | 'to' | 'containing') => Promise<string>;
	}

	export interface NightwatchAssertions {
		// Asserts on the total number of messages in the MailHog inbox matching a query.
		mailhogInboxCount: (this: Assert<NightwatchAPI> | NightwatchAssertion<number>, containing?: string, limit?: number, comparison?: 'atLeast' | 'atMost' | 'equal') => Promise<void>;
	}
}
