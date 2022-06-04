
export async function post(url: string, body: string): Promise<any> {

  return new Promise(resolve => {

    var xhr = new XMLHttpRequest();   // new HttpRequest instance 
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xhr.onreadystatechange = function () {

      if (xhr.readyState === 4 && xhr.response) {
        resolve(JSON.parse(xhr.response));
      } else {
      }
    }

    try {
      xhr.send();
    } catch (error) {
      resolve(null);
    }


  })
}

export async function get(url: string): Promise<any> {

  return new Promise(resolve => {

    var xhr = new XMLHttpRequest();   // new HttpRequest instance 
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        resolve(JSON.parse(xhr.response));
      }
    };
    xhr.open("GET", url, true);

    try {
      xhr.send();
    } catch (error) {
      resolve(null);
    }
  })
}

export async function options(url: string): Promise<any> {

  return new Promise(resolve => {

    var xhr = new XMLHttpRequest();   // new HttpRequest instance 
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        resolve(JSON.parse(xhr.response));
      }
    };
    xhr.open("OPTIONS", url, true);

    try {
      xhr.send();
    } catch (error) {
      resolve(null);
    }

  })
}