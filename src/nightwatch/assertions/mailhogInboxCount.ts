import {type NightwatchAssertion} from 'nightwatch';

export const assertion = function mailhogInboxCount(
	this: NightwatchAssertion<number>,
	containing: string | undefined = undefined,
	count = 1,
	comparison: 'atLeast' | 'atMost' | 'equals' = 'equals',
) {
	this.message = `Looking for MailHog messages containing "${containing}": ${comparison} ${count}`;
	this.expected = count;

	this.value = result => result.value ?? 0;

	this.evaluate = value => {
		switch (comparison) {
			case 'atLeast': {
				return value >= count;
			}

			case 'atMost': {
				return value <= count;
			}

			default: {
				return value === count;
			}
		}
	};

	this.command = async callback => {
		const mailhogUrl = this.api.globals.mailhog as string | undefined;
		if (!mailhogUrl) {
			throw new Error('globals.mailhog is empty; expected a URL to its API endpoint in nightwatch global variables, e.g. http://localhost:4566/mailhog/api');
		}

		let getUrl = '/v2/messages?limit=0';
		if (containing) {
			getUrl = `/v2/search?limit=0&kind=containing&query=${containing}`;
		}

		const response = await this
			.api
			.supertest
			.request(mailhogUrl)
			.get(getUrl)
			.set('Accept', 'application/json')
			.expect(200);

		const matches = response.body.total as number;
		callback({value: matches});
	};
};
