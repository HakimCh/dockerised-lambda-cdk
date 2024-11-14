import _ from "lodash/fp";

export const toPascalCase: (text: string) => string = _.pipe(
    _.camelCase,
    _.startCase,
    _.replace(/ /g, "")
);