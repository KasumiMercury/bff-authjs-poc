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

type OTPInfo struct {
	Code   string
	Email  string
	Expiry time.Time
}

var (
	otpStorage = make(map[string]OTPInfo)
	otpMutex   sync.RWMutex
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
