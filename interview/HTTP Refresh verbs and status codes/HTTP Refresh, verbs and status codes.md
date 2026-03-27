# HTTP Refresh, verbs and status codes

“HTTP, or Hypertext Transfer Protocol, is the foundation of data communication for the World Wide Web. It operates as a request-response protocol between a client and server.

## **HTTP Request Structure**

An HTTP request consists of three main parts:

1. **Request Line**: Includes the method (verb), the URL, and the HTTP version. For example, GET /index.html HTTP/1.1.
2. **Headers**: Key-value pairs that provide essential information about the request or the client itself. Common headers include Host, which specifies the domain name of the server, Accept, which indicates the content types the client can handle, and User-Agent, which identifies the client software.
3. **Body**: Not present in all requests, the body contains data sent to the server. This is common in POST requests, where the body might contain form data.

## **HTTP Response Structure**

The response from the server also consists of three main components:

1. **Status Line**: Includes the HTTP version, a status code, and a status message. For example, HTTP/1.1 200 OK.
2. **Headers**: Similar to request headers, response headers provide information about the server or about how the client should handle the response. Examples include Content-Type, which describes the type of data in the response, and Set-Cookie, which includes cookies to be stored by the client.
3. **Body**: Contains the data requested by the client. For a typical web page, this would be the HTML of the page itself.

## **HTTP Verbs (Methods)**

HTTP defines several methods (also referred to as “verbs”) that indicate the desired action to be performed on the identified resource:

- **GET**: Retrieves data from the server (idempotent).
- **POST**: Sends data to the server. Used typically for creating resources.
- **PUT**: Replaces all current representations of the target resource with the uploaded content (idempotent).
- **DELETE**: Removes all current representations of the target resource given by a URL (idempotent).
- **PATCH**: Partially updates a resource.
- **HEAD**: Similar to GET, but it transfers the status line and the header section only.
- **OPTIONS**: Describes the communication options for the target resource.

## **HTTP Status Codes**

Status codes are issued by a server in response to a client’s request made to the server. They are grouped into five classes:

1. **1xx (Informational)**: Communicate transfer protocol-level information.
2. **2xx (Successful)**: Indicate that the client’s request was accepted successfully.
3. **3xx (Redirection)**: Indicate that further action needs to be taken by the client in order to complete the request.
4. **4xx (Client Error)**: Indicate an error that the client made (e.g., 404 Not Found).
5. **5xx (Server Error)**: Indicate an error with the server (e.g., 500 Internal Server Error).

### If interested to see the whole list

Here’s a **complete list of HTTP status codes**, organized by category with commonly used examples under each. This is super useful for web dev, API work, and understanding how web communication flows:

---

## **📘 1xx – Informational**

> These codes indicate that the request was received and the process is continuing.
> 

| **Code** | **Meaning** | **Description** |
| --- | --- | --- |
| 100 | Continue | Initial part of request received, client should continue. |
| 101 | Switching Protocols | Server is switching protocols as requested by client. |
| 102 | Processing (WebDAV) | Server is processing the request but no response yet. |
| 103 | Early Hints | Used to preload resources while server prepares full response. |

---

## **✅ 2xx – Successful**

> These codes indicate that the client’s request was successfully received and understood.
> 

| **Code** | **Meaning** | **Description** |
| --- | --- | --- |
| 200 | OK | Standard success response. |
| 201 | Created | Resource created successfully. |
| 202 | Accepted | Request accepted but not completed. |
| 203 | Non-Authoritative Information | Returned info may be from a third party. |
| 204 | No Content | Request succeeded, no content returned. |
| 205 | Reset Content | Request succeeded, reset the document view. |
| 206 | Partial Content | Partial content for range requests. |
| 207 | Multi-Status (WebDAV) | Multiple statuses for batch requests. |
| 208 | Already Reported (WebDAV) | Elements already reported. |
| 226 | IM Used | Server fulfilled request via delta encoding. |

---

## **🔁 3xx – Redirection**

> The client must take additional action to complete the request.
> 

| **Code** | **Meaning** | **Description** |
| --- | --- | --- |
| 300 | Multiple Choices | Multiple options for the resource. |
| 301 | Moved Permanently | Resource has moved permanently. |
| 302 | Found (Previously “Moved Temporarily”) | Temporary redirect. |
| 303 | See Other | Redirect to another URI using GET. |
| 304 | Not Modified | Cached version is still valid. |
| 305 | Use Proxy *(deprecated)* | Must access via proxy. |
| 306 | Switch Proxy *(unused)* | Reserved, no longer used. |
| 307 | Temporary Redirect | Same method to new URL. |
| 308 | Permanent Redirect | Like 301, but retains method and body. |

---

## **❌ 4xx – Client Errors**

> The client made an error in the request.
> 

| **Code** | **Meaning** | **Description** |
| --- | --- | --- |
| 400 | Bad Request | Malformed request syntax. |
| 401 | Unauthorized | Authentication required. |
| 402 | Payment Required | Reserved for future use. |
| 403 | Forbidden | Server refuses to fulfill. |
| 404 | Not Found | Resource not found. |
| 405 | Method Not Allowed | Method not supported. |
| 406 | Not Acceptable | Resource not acceptable by client. |
| 407 | Proxy Authentication Required | Authentication via proxy required. |
| 408 | Request Timeout | Client took too long. |
| 409 | Conflict | Conflict with current state. |
| 410 | Gone | Resource no longer available. |
| 411 | Length Required | Content-Length header is missing. |
| 412 | Precondition Failed | Preconditions in request failed. |
| 413 | Payload Too Large | Request entity too large. |
| 414 | URI Too Long | URI too long to process. |
| 415 | Unsupported Media Type | Format not supported. |
| 416 | Range Not Satisfiable | Range request can’t be fulfilled. |
| 417 | Expectation Failed | Server can’t meet Expect header. |
| 418 | I’m a teapot ☕ *(joke RFC)* | April Fools easter egg. |
| 421 | Misdirected Request | Sent to wrong server. |
| 422 | Unprocessable Entity (WebDAV) | Syntax valid but semantically wrong. |
| 423 | Locked (WebDAV) | Resource is locked. |
| 424 | Failed Dependency (WebDAV) | Failed due to previous request. |
| 425 | Too Early | Risk of replay attacks. |
| 426 | Upgrade Required | Client must switch protocols. |
| 428 | Precondition Required | Must specify preconditions. |
| 429 | Too Many Requests | Rate-limited. |
| 431 | Request Header Fields Too Large | Headers too large. |
| 451 | Unavailable For Legal Reasons | Censored or legally blocked. |

---

## **🔥 5xx – Server Errors**

> The server failed to fulfill a valid request.
> 

| **Code** | **Meaning** | **Description** |
| --- | --- | --- |
| 500 | Internal Server Error | Generic server error. |
| 501 | Not Implemented | Server doesn’t support feature. |
| 502 | Bad Gateway | Invalid response from upstream. |
| 503 | Service Unavailable | Server overloaded or down. |
| 504 | Gateway Timeout | Upstream server timeout. |
| 505 | HTTP Version Not Supported | Unsupported HTTP version. |
| 506 | Variant Also Negotiates | Configuration error. |
| 507 | Insufficient Storage (WebDAV) | Server can’t store the representation. |
| 508 | Loop Detected (WebDAV) | Infinite loop detected. |
| 510 | Not Extended | Additional extensions required. |
| 511 | Network Authentication Required | Must authenticate to access network. |

Understanding these components and how they interact is crucial for designing secure communication over the internet. Security considerations involve ensuring data integrity and confidentiality through headers like Authorization for access control, using HTTPS (HTTP Secure) to encrypt the connection with SSL/TLS, and understanding the implications of each HTTP method in terms of CRUD (create, read, update, delete) operations and idempotence.”