import { io } from "../index.js";

export const emitRoleEvent = (event, data) => {
  io.emit(event, data);
};

export const emitUserEvent = (event, data) => {
  io.emit(event, data);
};

export const emitCategoryEvent = (event, data) => {
  io.emit(event, data);
};

export const emitProductEvent = (event, data) => {
  io.emit(event, data);
};

export const emitSaleEvent = (event, data) => {
  io.emit(event, data);
};

export const emitStockAlertEvent = (event, data) => {
  io.emit(event, data);
};

export const emitCustomerEvent = (event, data) => {
  io.emit(event, data);
};
