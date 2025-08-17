package main

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("test-secret-key")

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type OTPRequest struct {
	Email string `json:"email" binding:"required"`
}

type OTPVerifyRequest struct {
	Email string `json:"email" binding:"required"`
	OTP   string `json:"otp" binding:"required"`
}

type OTPResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type OAuthLoginRequest struct {
	Email        string `json:"email" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Provider     string `json:"provider" binding:"required"`
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresAt    int64  `json:"expires_at,omitempty"`
}

type OTPInfo struct {
	Code   string
	Email  string
	Expiry time.Time
}

type GoogleTokenInfo struct {
	UserID       string
	Email        string
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	CreatedAt    time.Time
}


var (
	otpStorage    = make(map[string]OTPInfo)
	otpMutex      sync.RWMutex
	googleTokens  = make(map[string]GoogleTokenInfo) // userID -> GoogleTokenInfo
	googleMutex   sync.RWMutex
)

func generateJWT(username string) (string, error) {
	claims := jwt.MapClaims{
		"username": username,
		"iat":      time.Now().Unix(),
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func generateOTP() string {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		log.Printf("Error generating OTP: %v", err)
		return "123456"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

func storeOTP(email string, otp string) {
	otpMutex.Lock()
	defer otpMutex.Unlock()
	
	otpInfo := OTPInfo{
		Code:   otp,
		Email:  email,
		Expiry: time.Now().Add(5 * time.Minute),
	}
	
	otpStorage[email] = otpInfo
	log.Printf("OTP sent to email: %s, Code: %s", email, otp)
}

func verifyOTP(email string, otp string) bool {
	otpMutex.RLock()
	defer otpMutex.RUnlock()
	
	otpInfo, exists := otpStorage[email]
	if !exists {
		log.Printf("OTP verification: email=%s, success=false (not found)", email)
		return false
	}
	
	if time.Now().After(otpInfo.Expiry) {
		log.Printf("OTP verification: email=%s, success=false (expired)", email)
		delete(otpStorage, email)
		return false
	}
	
	success := otpInfo.Code == otp
	log.Printf("OTP verification: email=%s, success=%t", email, success)
	
	if success {
		delete(otpStorage, email)
	}
	
	return success
}

func cleanupExpiredOTPs() {
	otpMutex.Lock()
	defer otpMutex.Unlock()
	
	now := time.Now()
	for email, otpInfo := range otpStorage {
		if now.After(otpInfo.Expiry) {
			delete(otpStorage, email)
			log.Printf("Cleaned up expired OTP for email: %s", email)
		}
	}
}

func logGoogleTokenStatus() {
	googleMutex.RLock()
	defer googleMutex.RUnlock()
	
	if len(googleTokens) == 0 {
		log.Printf("=== Google Token Status ===")
		log.Printf("No Google tokens stored")
		log.Printf("=========================")
		return
	}
	
	log.Printf("=== Google Token Status ===")
	log.Printf("Total stored tokens: %d", len(googleTokens))
	
	now := time.Now()
	for userID, tokenInfo := range googleTokens {
		timeUntilExpiry := time.Until(tokenInfo.ExpiresAt)
		isExpired := now.After(tokenInfo.ExpiresAt)
		status := "VALID"
		if isExpired {
			status = "EXPIRED"
		} else if timeUntilExpiry < 5*time.Minute {
			status = "EXPIRING_SOON"
		}
		
		log.Printf("User: %s | Email: %s | Status: %s | Expires: %v | Time Until Expiry: %v",
			userID, tokenInfo.Email, status, tokenInfo.ExpiresAt.Format("2006-01-02 15:04:05"), timeUntilExpiry)
	}
	log.Printf("=========================")
}

func storeGoogleToken(userID, email, accessToken, refreshToken string, expiresAt int64) {
	googleMutex.Lock()
	defer googleMutex.Unlock()
	
	tokenInfo := GoogleTokenInfo{
		UserID:       userID,
		Email:        email,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Unix(expiresAt, 0),
		CreatedAt:    time.Now(),
	}
	
	googleTokens[userID] = tokenInfo
	
	// 詳細ログ出力
	log.Printf("=== Google Token Stored ===")
	log.Printf("User ID: %s", userID)
	log.Printf("Email: %s", email)
	log.Printf("Access Token: %s... (length: %d)", truncateToken(accessToken, 30), len(accessToken))
	log.Printf("Refresh Token: %s... (length: %d)", truncateToken(refreshToken, 30), len(refreshToken))
	log.Printf("Expires At: %v", tokenInfo.ExpiresAt)
	log.Printf("Time Until Expiry: %v", time.Until(tokenInfo.ExpiresAt))
	log.Printf("Created At: %v", tokenInfo.CreatedAt)
	log.Printf("Total Stored Tokens: %d", len(googleTokens))
	log.Printf("========================")
}

func truncateToken(token string, maxLen int) string {
	if len(token) <= maxLen {
		return token
	}
	return token[:maxLen]
}

func getGoogleToken(userID string) (GoogleTokenInfo, bool) {
	googleMutex.RLock()
	defer googleMutex.RUnlock()
	
	tokenInfo, exists := googleTokens[userID]
	return tokenInfo, exists
}

func isTokenExpired(tokenInfo GoogleTokenInfo) bool {
	return time.Now().After(tokenInfo.ExpiresAt.Add(-5 * time.Minute))
}

func refreshGoogleToken(tokenInfo GoogleTokenInfo) (*GoogleTokenInfo, error) {
	// PoC実装: 実際のGoogle OAuth2 APIを呼び出さずにトークンを更新したことにする
	log.Printf("Refreshing Google token for user: %s (PoC implementation)", tokenInfo.UserID)
	
	// 新しいアクセストークンを生成（PoC用のダミー）
	newAccessToken := fmt.Sprintf("refreshed_access_token_%d", time.Now().Unix())
	newExpiresAt := time.Now().Add(1 * time.Hour)
	
	newTokenInfo := GoogleTokenInfo{
		UserID:       tokenInfo.UserID,
		Email:        tokenInfo.Email,
		AccessToken:  newAccessToken,
		RefreshToken: tokenInfo.RefreshToken, // リフレッシュトークンは保持
		ExpiresAt:    newExpiresAt,
		CreatedAt:    tokenInfo.CreatedAt,
	}
	
	googleMutex.Lock()
	googleTokens[tokenInfo.UserID] = newTokenInfo
	googleMutex.Unlock()
	
	log.Printf("Token refreshed for user: %s, new expires: %v", tokenInfo.UserID, newExpiresAt)
	return &newTokenInfo, nil
}

