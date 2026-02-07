package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		log.Printf("[%s] %s %s %d %s",
			c.Method(),
			c.Path(),
			c.IP(),
			c.Response().StatusCode(),
			time.Since(start),
		)

		return err
	}
}
