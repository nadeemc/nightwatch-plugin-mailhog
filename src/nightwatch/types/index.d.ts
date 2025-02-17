import type {Awaitable} from 'nightwatch';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Nightwatch setup does not yet support extensionless/directory imports.
import type {IfUnknown} from 'nightwatch/types/utils';
import type {NightwatchAssertionsResult} from 'nightwatch/types/assertions';
import type {MailHogFindOptions, MailHogItem} from '../commands/mailhog.ts';

export * from 'nightwatch';

declare module 'nightwatch' {
	export interface NightwatchCustomAssertions<ReturnType> {
		/**
		 * Asserts on the number of matching messages in the MailHog inbox.
		 * @param expected the expected number of messages
		 * @param comparison 'lessThanOrEqual' | 'greaterThanOrEqual' | 'equal' (default)
		 * @param query e.g. an email address or substring
		 * @param kind 'from' | 'to' | 'containing' (default)
		 */
		mailhogInboxCount: (expected: number, comparison?: 'lessThanOrEqual' | 'greaterThanOrEqual' | 'equal', query?: string, kind?: 'from' | 'to' | 'containing') => Awaitable<IfUnknown<ReturnType, this>, NightwatchAssertionsResult<number>>;
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
			 * @param queryOrOptions The query string or options to find the email.
			 *  If a string, it is treated as a 'containing' query by default.
			 */
			findEmails: (queryOrOptions: string | MailHogFindOptions, callback: (items: MailHogItem[]) => void | Promise<void>) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Finds the most recent email in the MailHog inbox matching the
			 * query. This uses findEmails and toSortedByDate internally.
			 * @param queryOrOptions The query string or options to find the email.
			 *  If a string, it is treated as a 'containing' query by default.
			 */
			findMostRecentEmail: (queryOrOptions: string | MailHogFindOptions, callback: (item: MailHogItem | undefined) => void | Promise<void>) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Retrieves a specific email in the MailHog inbox by its ID.
			 */
			getEmail: (id: string, callback: (item: MailHogItem) => void | Promise<void>) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Retrieves a one-time code from the MailHog inbox by searching
			 * for an email, parses it, and then deletes that email.
			 * Expects an element like: <code data-otp="one-time-code">123456</code> in the body.
			 * @param queryOrOptions The query string or options to find the email.
			 *  If a string, it is treated as a 'to' email address query by default.
			 */
			getOneTimeCode: (queryOrOptions: string | MailHogFindOptions, callback: (code: string) => void | Promise<void>) => Awaitable<NightwatchAPI, Error | null>;
			/**
			 * Retrieves the most recent email in the MailHog inbox. This
			 * returns the items rather than an Awaitable browser, but uses
			 * findEmails internally.
			 */
			performFindEmails: (queryOrOptions: string | MailHogFindOptions) => Promise<MailHogItem[]>;
			/**
			 * Retrieves the most recent email in the MailHog inbox. This
			 * returns the item rather than an Awaitable browser, but uses
			 * findMostRecentEmail internally.
			 */
			performFindMostRecentEmail: (queryOrOptions: string | MailHogFindOptions) => Promise<MailHogItem | undefined>;
			/**
			 * Retrieves a specific email in the MailHog inbox by its ID.
			 * This returns the item rather than an Awaitable browser, but uses
			 * getEmail internally.
			 */
			performGetEmail: (id: string) => Promise<MailHogItem>;
			/**
			 * Retrieves a one-time code from the MailHog inbox by searching
			 * for an email, parses it, and then deletes that email.
			 * Expects an element like: <code data-otp="one-time-code">123456</code> in the body.
			 * This returns the code rather than an Awaitable browser, but uses
			 * getOneTimeCode internally.
			 * @param queryOrOptions The query string or options to find the email.
			 *  If a string, it is treated as a 'to' email address query by default.
			 */
			performGetOneTimeCode: (queryOrOptions: string | MailHogFindOptions) => Promise<string>;
			/**
			 * Sorts in descending order by date, based on the Header of the
			 * email or the MailHog server timestamp (if no Header value exists).
			 * Useful when trying to find the latest email matching a query.
			 */
			toSortedByDate: (items: MailHogItem[]) => MailHogItem[];
		};
	}
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Nightwatch setup does not yet support extensionless/directory imports.
export type {MailHogFindOptions, MailHogItem} from '../commands/mailhog.ts';
