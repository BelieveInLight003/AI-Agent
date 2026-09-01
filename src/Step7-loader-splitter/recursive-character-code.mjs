import { getEncoding } from 'js-tiktoken';
import 'dotenv/config';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const enc = getEncoding('cl100k_base');

const jscode = `
  class Product {
  constructor(id, name, price, description) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.description = description;
  }

  getFormattedPrice() {
    return '$' + this.price.toFixed(2);
  }
}

class ShoppingCart {
  constructor() {
    this.items = [];
    this.discountCode = null;
    this.taxRate = 0.08;
  }
}

addItem(product, quantity = 1) {
  const existingItem = this.items.find(item => item.product.id === product.id);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product, quantity, addedAt: new Date() });
  }
  return this;
}

removeItem(productId) {
  this.items = this.items.filter(item => item.product.id !== productId);
  return this;
}

calculateSubtotal() {
  return this.items.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
}

class Product {
  constructor(id, name, price, description) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.description = description;
  }

  getFormattedPrice() {
    return '$' + this.price.toFixed(2);
  }
}

class ShoppingCart {
  constructor() {
    this.items = [];
    this.discountCode = null;
    this.taxRate = 0.08;
  }
}
`;

const jscodeDoc = new Document({
  pageContent: jscode,
});

const splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
  chunkSize: 300,
  chunkOverlap: 60,
});

const splitJsDocs = await splitter.splitDocuments([jscodeDoc]);

splitJsDocs.forEach((doc) => {
  console.log('content', doc.pageContent);
  console.log('character length', doc.pageContent.length);
  console.log('token length', enc.encode(doc.pageContent).length);
  console.log('--------------------------------');
});
