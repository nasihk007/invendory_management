class DataResponseDto {
  constructor(data, status, message, dto, total, token, refresh, newAccount) {
    const isTrue = this._getStatus(status, data);
    this.statusCode = isTrue ? 200 : 400;
    this.status = isTrue ? true : false;
    this.message = this._getMessage(message, status, isTrue);
    this.data = isTrue ? data : null;
    this.token = this._getToken(token, dto);
    this.refreshToken = this._getRefreshToken(refresh, total);
    this.newAccount = this._getAccountStatus(newAccount, token);
    this.meta = this._getMeta(isTrue, dto, total, message, status, data);
  }

  _isValid(obj) {
    if (typeof obj !== 'object' || obj === null) return false;
    if ('take' in obj && 'page' in obj) return true;
    return false;
  }

  _getMessage(message, status, isTrue) {
    if (typeof message === 'string') return message;
    if (typeof status === 'string') return status;
    if (isTrue) return 'Request Completed Successfully.';
    return 'No Data Found.';
  }

  _getStatus(status, data) {
    if (typeof status === 'boolean' && status === true) return true;
    if (data !== null && status === false) return false;
    if (data !== null) return true;
    return false;
  }

  _getToken(token, dto) {
    if (typeof token === 'string') return token;
    if (typeof dto === 'string') return dto;
    return undefined;
  }

  _getRefreshToken(refresh, total) {
    if (typeof refresh === 'string') return refresh;
    if (typeof total === 'string') return total;
    return undefined;
  }

  _getAccountStatus(newAccount, token) {
    if (typeof newAccount === 'boolean') return newAccount;
    if (typeof token === 'boolean') return token;
    return undefined;
  }

  _getMeta(isTrue, dto, total, message, status, data) {
    const types = [
      { value: dto, num: total },
      { value: total, num: dto },
      { value: status, num: message },
      { value: message, num: status }
    ];

    for (const { value, num } of types) {
      if (!(isTrue && this._isValid(value) && typeof num === 'number')) continue;
      const pageOptions = value;
      return {
        take: Number(pageOptions?.take),
        itemCount: Array.isArray(data) ? data.length : 0,
        page: Number(pageOptions?.page),
        totalPages: Math.ceil(num / pageOptions?.take),
        hasPreviousPage: pageOptions.page > 1,
        hasNextPage: pageOptions?.page < Math.ceil(num / pageOptions?.take)
      };
    }
    return undefined;
  }
}

module.exports = DataResponseDto;