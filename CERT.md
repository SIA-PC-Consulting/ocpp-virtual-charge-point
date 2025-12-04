<!-- LeafCert -->
base64 -d leafcert.txt > leafcert.der
xxd -l 16 leafcert.der
openssl pkcs7 -inform DER -in leafcert.der -print_certs -out leafcert.pem
openssl x509 -in leafcert.pem -serial -noout | sed 's/serial=//;s/^0*//'


<!-- Issuer -->
base64 -d issuer.txt > issuer.der
openssl pkcs7 -inform DER -in issuer.der -print_certs -out issuer.pem