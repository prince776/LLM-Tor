# LLM Tor
A anonymous layer for accessing public LLMs. The goal of this layer is to provide strong cryptographic guarantees
on the anonymity level. Not a trust based algo "we won't log your details".

The core idea is to combine Blinded Signing With an LLM-Proxy layer along with Tor.

See whitepaper: https://github.com/prince776/LLM-Tor/blob/672d954ae2691ad64ffdd65ea5de7495c7bf9214/whitepaper.pdf

# License
See LICENSE file in this directory.
For desktop-client, a separate license is present in its directory.

# Public Keys For Clients

## For Gemini 2.5 Flash Lite
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1Dk7ov86YfP7kj292EkD
QY1j+Tx/x/Nv3L7rhuVxs0Pst/bDEqZZ7/zSojauELNHQ7Lp87Ml10VMKjgU6DqK
MxFyMO8cOtMURsHE88tmz9bocf8e5JjoLQvM8JInzKUPGfHsAZE3Mbi+O0ACqJ/n
aYvyTdIffLNM0DoVx5zc4ehzNmvHBsLQN16aYlGSbR1jzb8RD5AFzCfIpnV/UlUU
p4i1wHQujkTF+YFdq0az0vFE4zm8Sxz/r+Siif76jJZPi/wfWPO7TC0/0gppHUV3
jZ/6ut6juhD4WuhungqzsvMSZkntZ9UtXJgzhYj6c1MATIoRHq2cs5IHf75jjpqT
1wIDAQAB
-----END PUBLIC KEY-----
```

## For Gemini 2.5 Flash

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAltEfFcuqWqCzIWo1KoBw
7CkuhN+0H6mkryHtXsxpf65wAJEF2WtYFSFcV1fkAlS8NaSszYJWf7NAQNta91nX
NqZUgj2/sGANpnIaCjjPZvu5cWNJdExj76lvRXbNGdJZE6elWIpoASqVkOHitkiC
NvBwetIXK2mTDt1mZjghTBpRDL55CO9OZibaUu5O4Ne2jJbuXDQXUa0ILKvJv/P/
u/tOsYmsQMcLI0Kr0PH7sG811PDVj3bhjVPTYIGulWVPEuiZ9bCLl17LtvZvuP5b
c6FMS+X3zFNcYkytaUhtqN9wTLYi50T5rtEOA+r1y3Hl6uzqNw/+1zBQA89FjtP5
bwIDAQAB
-----END PUBLIC KEY-----
```

## For Gemini 2.5 Pro

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvsbtMkicFQJnV7tcONzS
zLM98CRxV2cTGiGyzxttKcrxlOaXjV1oy7a5b72Ubv6SfVjBSbgK5PXXkr4ZjeT8
5o3ha4pGv3XQx+rQKoaxxxXmHD+7R/7ey7weArRF911DfqFzLMXgJ7oJ9fnM+MbC
/i8Z8keto+OX8rHFH5vy9nsdOFJoSAQOMvz4i7LVSUGG6Z8npNON+dMi6jH9j0Ai
JsinDTYIWLru4+A4WAJnmkow++lkmg/pShOoM2Hgi6Ld1lIpgpotIvUSPkKDnTIS
ncGUsaIdf9aGZKabOBFe5ujpTBZSTBYCm+/hP3+2m5UiYEy5TiOZYUqmo2JfNIha
dwIDAQAB
-----END PUBLIC KEY-----
```

## For Gemini 3 Flash
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1Vry9JgiA+0GlLrKqLku
5WmhNXln4XcIq3biXVM2EMlC+tKgdh3ZatuJJFGSEpWci5f2fGz656pfzUGU4obX
UkrvdKa5OEPOYUmnAwA+P9Q8xC+01EDLuUG3cDxDO6ZDFi8eLPzujq6KGCac2jmO
CDTQ1itYxq7tSZnMz3G0h5JaCeDDdS6etDVqhhpSonjK/GjN9y8aPcPkU9VwIi+F
kB1it83qrC2YHYqT4cH/s51NT5xRFsfBR4y3xkFfX+AxMaki2F3717l4njjPdPjq
wNqmo7PI6ImNt5APFuu+Wyk4Ygq5ChIeAqV56X21smlSiAUBymmQ3ZknNSRFoLiL
2QIDAQAB
-----END PUBLIC KEY-----
```

## For Gemini 3 Pro
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAubk4xfxf7Wy2c2n4haJV
BGmaa525fmMvsWhYjgZHhrBFBPx/i2ESDyFvS9REaO0glJG36dMCswAWFiFinv6v
YvQBVCWykLt1j76klZsQaxhgajg3KIoDVNeRDnxcpq5F9EYwt/br4ukHjFtBiWlS
KPMtK7X/6BhA0K9LRbeFdEz+ERMPMWXN54y19lNSWxVfdCmQZd87HRwu4rP08xyG
kbHNoWk6fX6lMLbz2srEfRtiHwa3814cAKOSAOtuPtmQI+EBvdqLB3jxB1CKaZiz
Tnw3Dt0EA+34F+S4dQ/nnQQnxEuIBZXDDREcgZ30VKw1uP/lzLNlTJKTqNi+D/2P
wQIDAQAB
-----END PUBLIC KEY-----
```

# Detailed Design
TODO
