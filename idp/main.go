package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	r.GET("/health", healthHandler)
	r.POST("/login", loginHandler)
	r.POST("/send-otp", sendOTPHandler)
	r.POST("/verify-otp", verifyOTPHandler)
	r.POST("/oauth-login", oauthLoginHandler)

	r.Run(":8080")
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}

func loginHandler(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	token, err := generateJWT(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{Token: token})
}

func sendOTPHandler(c *gin.Context) {
	var req OTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	otp := generateOTP()
	storeOTP(req.Email, otp)

	c.JSON(http.StatusOK, OTPResponse{
		Success: true,
		Message: "OTP sent successfully",
	})
}

func verifyOTPHandler(c *gin.Context) {
	var req OTPVerifyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if !verifyOTP(req.Email, req.OTP) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	token, err := generateJWT(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{Token: token})
}

func oauthLoginHandler(c *gin.Context) {
	log.Printf("OAuth login endpoint called")
	
	var req OAuthLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("OAuth login: Invalid request format - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	log.Printf("OAuth login request: provider=%s, email=%s, name=%s", req.Provider, req.Email, req.Name)
	
	// Googleトークンが送信されている場合は保存
	if req.Provider == "google" {
		if req.AccessToken != "" {
			log.Printf("=== OAuth Login: Google Token Received ===")
			log.Printf("User Email: %s", req.Email)
			log.Printf("Access Token Received: YES (length: %d)", len(req.AccessToken))
			log.Printf("Refresh Token Received: %t (length: %d)", req.RefreshToken != "", len(req.RefreshToken))
			log.Printf("Token Expires At: %d (%v)", req.ExpiresAt, time.Unix(req.ExpiresAt, 0))
			log.Printf("==========================================")
			
			storeGoogleToken(req.Email, req.Email, req.AccessToken, req.RefreshToken, req.ExpiresAt)
		} else {
			log.Printf("=== OAuth Login: Google Token Missing ===")
			log.Printf("User Email: %s", req.Email)
			log.Printf("Access Token: MISSING")
			log.Printf("Refresh Token: MISSING")
			log.Printf("Note: Tokens may not have been sent by NextAuth")
			log.Printf("========================================")
		}
	}

	token, err := generateJWT(req.Email)
	if err != nil {
		log.Printf("OAuth login: Failed to generate JWT for %s - %v", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	log.Printf("OAuth login: JWT token generated successfully for user: %s", req.Email)
	c.JSON(http.StatusOK, LoginResponse{Token: token})
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

