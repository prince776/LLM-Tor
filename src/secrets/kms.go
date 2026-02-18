package secrets

import (
	context "context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/keyvault/azkeys"
	"github.com/cockroachdb/errors"
	"github.com/patrickmn/go-cache"
	"llmmask/src/common"
	"strings"
	"time"
)

type AzureKMS struct {
	client       *azkeys.Client
	key          string
	encryptCache *cache.Cache
	decryptCache *cache.Cache
}

var defaultKMS *AzureKMS

func DefaultKMS() *AzureKMS {
	return defaultKMS
}

func Init(ctx context.Context) {
	defaultKMS = common.Must(NewKMS(common.PlatformCredsConfig().KeyVaultCreds))
	InitRSA(ctx)
	InitPlatformDEKs(ctx)
}

func NewKMS(kmsCreds *common.KeyVaultCredsConfig) (*AzureKMS, error) {
	cred, err := azidentity.NewClientSecretCredential(kmsCreds.TenantID, kmsCreds.ClientID, kmsCreds.ClientSecret, nil)
	if err != nil {
		return nil, err
	}
	client, err := azkeys.NewClient(kmsCreds.URL, cred, nil)
	if err != nil {
		return nil, err
	}
	return &AzureKMS{
		client:       client,
		key:          kmsCreds.PlatformKey,
		encryptCache: cache.New(10*time.Minute, 30*time.Minute),
		decryptCache: cache.New(10*time.Minute, 30*time.Minute),
	}, nil
}

type encryptCacheResp struct {
	res   string
	keyID string
}

func (k *AzureKMS) Encrypt(ctx context.Context, plaintext []byte) (string, string, error) {
	ptHash := sha256.Sum256(plaintext)
	cacheKey := string(ptHash[:])
	cached, found := k.encryptCache.Get(cacheKey)
	if found {
		cached, ok := cached.(encryptCacheResp)
		common.Assert(ok, "encrypt cache ill structured")
		return cached.res, cached.keyID, nil
	}

	params := azkeys.KeyOperationsParameters{
		Algorithm: to.Ptr(azkeys.JSONWebKeyEncryptionAlgorithmRSAOAEP),
		Value:     plaintext,
	}
	resp, err := k.client.Encrypt(ctx, k.key, "", params, nil)
	if err != nil {
		return "", "", errors.Wrapf(err, "failed to encrypt")
	}
	ct := base64.StdEncoding.EncodeToString(resp.Result)
	keyID := *resp.KID

	_ = k.encryptCache.Add(cacheKey, encryptCacheResp{
		res:   ct,
		keyID: string(keyID),
	}, time.Minute*10)

	decCacheKey := decryptCacheKey(string(keyID), string(ct))
	_ = k.decryptCache.Add(decCacheKey, plaintext, time.Minute*10)
	return ct, string(keyID), nil
}

func decryptCacheKey(keyID, cipherTextB64 string) string {
	sha := sha256.Sum256([]byte(cipherTextB64))
	return fmt.Sprintf(
		"%s-%s",
		keyID,
		string(sha[:]),
	)
}

func (k *AzureKMS) Decrypt(ctx context.Context, ciphertextB64 string, keyID string) ([]byte, error) {
	decCacheKey := decryptCacheKey(keyID, ciphertextB64)
	if cached, found := k.decryptCache.Get(decCacheKey); found {
		cached, ok := cached.([]byte)
		common.Assert(ok, "decrypt cache ill structured data found")
		return cached, nil
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return nil, err
	}
	params := azkeys.KeyOperationsParameters{
		Algorithm: to.Ptr(azkeys.JSONWebKeyEncryptionAlgorithmRSAOAEP),
		Value:     ciphertext,
	}
	keyName := keyNameFromKeyID(keyID)
	keyVersion := keyVersionFromKeyID(keyID)
	resp, err := k.client.Decrypt(ctx, keyName, keyVersion, params, nil)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to decrypt")
	}

	_ = k.decryptCache.Add(decCacheKey, resp.Result, time.Minute*10)
	return resp.Result, nil
}

func keyVersionFromKeyID(kid string) string {
	tokens := strings.Split(kid, "/")
	return tokens[len(tokens)-1]
}

func keyNameFromKeyID(kid string) string {
	tokens := strings.Split(kid, "/")
	return tokens[len(tokens)-2]
}
