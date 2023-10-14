// eslint-disable-next-line import/no-extraneous-dependencies
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Request } from 'node-fetch';

(global as any).TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.Request = Request as any;
