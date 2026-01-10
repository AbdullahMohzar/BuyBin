import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function updateProducts() {
  try {
    const filePath = join(process.cwd(), 'src', 'Product.js');

    // Read products.js
    const fileContent = await readFile(filePath, 'utf8');

    // Dynamically import products.js to access the exported Products
    const productsModule = await import('../src/Product.js');
    let products = productsModule.Products;

    if (!Array.isArray(products)) {
      throw new Error('Products is not an array in Product.js');
    }

    // Add rating and comments to each product
    products = products.map(product => ({
      ...product,
      rating: product.rating || { rate: 0, count: 0 },
      comments: product.comments || [],
    }));

    // Create updated file content
    const updatedContent = `export let Products = ${JSON.stringify(products, null, 2)};\n`;

    // Write back to products.js
    await writeFile(filePath, updatedContent, 'utf8');
    console.log('Successfully updated products.js with rating and comments fields.');
  } catch (err) {
    console.error('Error updating products.js:', err);
  }
}

updateProducts();