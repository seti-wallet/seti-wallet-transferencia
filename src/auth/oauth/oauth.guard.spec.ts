import { OauthGuard } from './oauth.guard';

describe('OauthGuard', () => {
  it('should be defined', () => {
    expect(new OauthGuard()).toBeDefined();
  });
});
