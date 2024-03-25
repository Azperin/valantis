const moneyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const itemsPerPage = 50;
const filters = {
	product: '',
	brand: '',
	price: 0,
};
const cachedRequests = {}; // should be proxy ?
const PRODUCTS_NODE = document.querySelector('.products');
const BODY_NODE = document.querySelector('body');

let filterTimeout;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => getProductsBrands());

async function getProductsBrands() {
	const req = await APIRequest({
		"action": "get_fields",
		"params": { "field": "brand" }
	});

	if (req.status !== 200) {
		await logRequestError(req);
		await sleepTimer();
		await getProductsBrands();
		return;
	};

	const items = await req.json();
	const brands = [ ...new Set(items.result.filter(b => !!b)) ];
	const brandsElement = document.querySelector('.filter-by-brand');
	
	brands.forEach(brand => {
		const brandName = escapeHtml(brand);
		brandsElement.innerHTML += `<option value="${ brandName }" >${ brandName }</option>`;
	});

	populateProducts();
};

function populateProducts() {
	BODY_NODE.setAttribute('inert', true);
	PRODUCTS_NODE.innerHTML = '<div>Loading...</div>';

	if (filters.product || filters.brand || filters.price) {
		getFilteredProductsIds();
	} else {
		const offset = (currentPage - 1) * itemsPerPage;
		getProductsIds({ offset: offset });
	};
};

async function getProductsIds({ offset = 0, products = [] }) {
	const requestBody = {
		"action": "get_ids",
		"params": { "offset": offset, "limit": itemsPerPage }
	};
	const requestHash = md5(`${ currentPage }_${ offset }_${ itemsPerPage }_${ JSON.stringify(requestBody) }`);

	if (!cachedRequests.hasOwnProperty(requestHash)) {
		const req = await APIRequest(requestBody);

		if (req.status !== 200) {
			await logRequestError(req);
			await sleepTimer();
			await getProductsIds({ offset: offset, products: products });
			return;
		};

		cachedRequests[requestHash] = await req.json();
	};

	const items = cachedRequests[requestHash];

	if (items.result.length === 0) return getProductsFields(products);

	products = [ ...new Set([...products, ...items.result]) ].slice(0, itemsPerPage);
	
	if (products.length < itemsPerPage) {
		await sleepTimer();
		await getProductsIds({ offset: offset + itemsPerPage, products: products });
	} else {
		return getProductsFields(products);
	};
};

async function getFilteredProductsIds() {
	const filter = { ...filters };

	Object.keys(filter).forEach(fKey => {
		if (filter[fKey]) return;
		delete filter[fKey];
	});

	const requestBody = {
		"action": "filter",
		"params": { ...filter },
	};
	const requestHash = md5(`${ currentPage }_${ JSON.stringify(requestBody) }`);

	if (!cachedRequests.hasOwnProperty(requestHash)) {
		const req = await APIRequest(requestBody);

		if (req.status !== 200) {
			await logRequestError(req);
			await sleepTimer();
			await getFilteredProductsIds();
			return;
		};

		cachedRequests[requestHash] = await req.json();
	};

	const items = cachedRequests[requestHash];
	const products = [...new Set(items.result)];
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	
	return getProductsFields(products.slice(startIndex, endIndex));

};

async function getProductsFields(products = []) {
	if (products.length === 0) {
		PRODUCTS_NODE.innerHTML = '<div class="nodata">NO DATA</div>';
		BODY_NODE.removeAttribute('inert');
		return;
	};

	const requestBody = {
		"action": "get_items",
		"params": { "ids": products }
	};
	const requestHash = md5(`${ currentPage }_${ JSON.stringify(requestBody) }`);
	if (!cachedRequests.hasOwnProperty(requestHash)) {
		const req = await APIRequest(requestBody);

		if (req.status !== 200) {
			await logRequestError(req);
			await sleepTimer();
			await getProductsFields(products);
			return;
		};

		cachedRequests[requestHash] = await req.json();
	};

	const items = cachedRequests[requestHash];
	products = products.map(productId => items.result.find(item => item.id === productId));

	renderProducts(products);
};

function renderProducts(products) {
	PRODUCTS_NODE.innerHTML = '';

	products.forEach(item => {
		PRODUCTS_NODE.innerHTML += `
		<div class="product-card">
			<div class="product-name">${ escapeHtml(item.product) }</div>
			<div class="product-price">${ moneyFormatter.format(item.price) }</div>
			<div class="product-id">${ item.id }</div>
			<div class="product-brand">${ escapeHtml(item.brand || ' ') }</div>
		</div>`;
	});

	BODY_NODE.removeAttribute('inert');
};

async function logRequestError(req) {
	const errorId = await req.text();
	console.log(`API returns error with id: ${ errorId }`);
};

async function APIRequest(body) {
	const date = new Date();
	const year = `${ date.getUTCFullYear()}`;
	const month = `${ date.getUTCMonth() + 1}`.padStart(2, '0');
	const day = `${ date.getUTCDate() }`;
	const xAuth = md5(`Valantis_${year}${month}${day}`); // shoud be cached

	return fetch('http://api.valantis.store:40000/', { 
		method: 'POST', 
		headers: { 'X-Auth': `${ xAuth }`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
};

async function sleepTimer(ms = 300) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), ms);
	});
};

function resetFilters(selectorsToReset = []) {
	currentPage = 1;
	selectorsToReset.forEach(selector => {
		document.querySelector(selector).value = '';
	});
	document.querySelector('.page-number').innerHTML = currentPage;
	filters.brand = '';
	filters.product = '';
	filters.price = 0;
};

function escapeHtml(str) {
	return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
};

function md5(str) {
	return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
};

document.querySelectorAll('.pagination > button').forEach(btnEl => {
	btnEl.addEventListener('click', (e) => {
		const pageMod = parseInt(e.target.dataset.page, 10);
		let newPage = currentPage += pageMod;
		currentPage = newPage < 1 ? 1 : newPage;
		document.querySelector('.page-number').innerHTML = currentPage;
		populateProducts();
	});
});

document.querySelector('.filter-by-product').addEventListener('input', (e) => {
	resetFilters([ '.filter-by-brand', '.filter-by-price' ]);
	filters.product = e.target.value || '';
	clearTimeout(filterTimeout);
	filterTimeout = setTimeout(() => {
		populateProducts();
	}, 1000);
});

document.querySelector('.filter-by-brand').addEventListener('change', (e) => {
	resetFilters([ '.filter-by-price', '.filter-by-product' ]);
	filters.brand = e.target.value || '';
	populateProducts();
});

document.querySelector('.filter-by-price').addEventListener('input', (e) => {
	resetFilters([ '.filter-by-brand', '.filter-by-product' ]);
	filters.price = parseInt(e.target.value, 10) || 0;
	clearTimeout(filterTimeout);
	filterTimeout = setTimeout(() => {
		populateProducts();
	}, 1000);
});

