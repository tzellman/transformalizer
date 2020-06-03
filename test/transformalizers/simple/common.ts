import * as qs from 'qs';
import * as R from 'ramda';
import { Links, MetaObject } from '../../../lib';

export function determineLanguage({ language, languageAvailability, primaryLanguage }) {
    if (R.is(String, language) && languageAvailability.indexOf(language) !== -1) {
        return language;
    }
    if (R.is(String, primaryLanguage) || languageAvailability.indexOf(primaryLanguage) !== -1) {
        return primaryLanguage;
    }
    return undefined;
}

export function links({ input, options }): Links | undefined {
    if (!Array.isArray(input)) {
        return undefined;
    }
    const query = R.merge({ page: { size: 20, number: 1 } }, R.propOr('query', options));
    const nextQuery = R.assocPath(['page', 'number'], query.page.number + 1, query);
    return {
        self: `${options.baseUrl}/${options.basePath}?${qs.stringify(query)}`,
        next: `${options.baseUrl}/${options.basePath}?${qs.stringify(nextQuery)}`
    };
}

export function meta({ input, options }): MetaObject | undefined {
    // eslint-disable-line
    const aggs = R.prop('aggs', options);
    if (!aggs) {
        return undefined;
    }
    return { facets: aggs };
}
