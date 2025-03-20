const BASE_URL = "http://localhost:5000";

export async function createChat() {

    const resReal = await fetch(BASE_URL + '/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    const dataReal = await resReal.json();

    console.log(dataReal);

    const data = {
        id: "123"
    }
    const res = {
        ok: true,
        status: 200
    }
    if (!res.ok) {
        return Promise.reject({ status: res.status, data });
    }
    console.log(data);
    return data;
}

export async function getSafeWallets(address: string) {
    try {
        const response = await fetch(`${BASE_URL}/api/v1/owners/${address}/safes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching safe wallets:", error);
        return Promise.reject(error);
    }
}
