const { Order } = require('../../constants/constants');

class PageOptionsDto {
  constructor({ order = Order.DESC, page = 1, take = 10 } = {}) {
    this.order = order === Order.ASC ? Order.ASC : Order.DESC;
    this.page = Math.max(1, parseInt(page) || 1);
    this.take = Math.min(100, Math.max(1, parseInt(take) || 10));
  }

  get offset() {
    return (this.page - 1) * this.take;
  }

  get limit() {
    return this.take;
  }

  toSequelizeOptions() {
    return {
      limit: this.limit,
      offset: this.offset,
      order: this.order
    };
  }

  static fromQuery(query) {
    return new PageOptionsDto({
      order: query.order,
      page: query.page,
      take: query.take
    });
  }
}

module.exports = PageOptionsDto;