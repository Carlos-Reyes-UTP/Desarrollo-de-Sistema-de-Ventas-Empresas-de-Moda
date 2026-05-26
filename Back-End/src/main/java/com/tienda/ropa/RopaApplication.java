package com.tienda.ropa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.tienda.ropa.config.VentaDirectaConfig;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(VentaDirectaConfig.class)
public class RopaApplication {

	public static void main(String[] args) {
		SpringApplication.run(RopaApplication.class, args);
	}

}
