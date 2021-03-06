import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as prettier from 'prettier';

import { ToFontsOptions, FontType, UrlTemplate, UrlMap } from './types/index';

const urlTemplates: { [key in FontType]: UrlTemplate } = {
  eot: ({ url }): string => `url("${url}?#iefix") format("embedded-opentype")`,
  woff2: ({ url }): string => `url("${url}") format("woff2")`,
  woff: ({ url }): string => `url("${url}") format("woff")`,
  ttf: ({ url }): string => `url("${url}") format("truetype")`,
  svg: ({ url, fontName }): string => `url("${url}#${fontName}") format("svg")`,
};

const makeUrlMap = (opts: ToFontsOptions): UrlMap => {
  const res: UrlMap = {};
  const cssFontsUrl = path.relative(path.dirname(opts.css.out as string), opts.out as string);

  opts.types.forEach(
    (type): void => {
      const fontName = `${opts.fontName}${opts.hashStr ? `_${opts.hashStr}` : ''}.${type}`;
      res[type] = path.join(cssFontsUrl, fontName).replace(/\\/g, '/');
    }
  );

  return res;
};

const makeSrc = (opts: ToFontsOptions, urls: UrlMap): string => {
  const src = opts.types
    .filter((type): boolean => !!urls[type])
    .map(
      (type): string => {
        return urlTemplates[type]({
          url: urls[type] as string,
          fontName: opts.fontName,
        });
      }
    )
    .join(',\n');

  return src;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeCtx = (opts: ToFontsOptions, urls: UrlMap): Record<string, any> => {
  const codepoints: { [key: string]: string } = {};

  // Transform codepoints to hex strings
  Object.keys(opts.codepoints).forEach(
    (name): void => {
      codepoints[name] = opts.codepoints[name].toString(16);
    }
  );

  return {
    fontName: opts.fontName,
    src: makeSrc(opts, urls),
    classPrefix: opts.classPrefix,
    codepoints: codepoints,
    ...opts.css.options,
  };
};

const renderCss = (opts: ToFontsOptions, urlMap?: UrlMap): string => {
  if (!urlMap) {
    urlMap = makeUrlMap(opts);
  }

  const ctx = makeCtx(opts, urlMap);
  const source = fs.readFileSync(opts.css.template as string, 'utf8');
  const template = handlebars.compile(source);

  return prettier.format(template(ctx), { parser: 'css', printWidth: 120 });
};

export default renderCss;
