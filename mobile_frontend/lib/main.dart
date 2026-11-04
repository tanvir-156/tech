import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/product_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/address_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() {
  runApp(const TechNestApp());
}

class TechNestApp extends StatelessWidget {
  const TechNestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..checkAuthStatus()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => AddressProvider()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'TechNest',
        // All styling now comes from one theme file rather than being
        // redefined per screen.
        theme: AppTheme.light,
        home: const AuthGate(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const MainShell(),
        },
      ),
    );
  }
}

/// Decides what the user sees on launch.
///
/// This used to live inline as the '/' route's builder, which caused a
/// subtle problem: after logging in, screens called
/// pushNamedAndRemoveUntil('/home'), but '/' was ALSO a Consumer that
/// rebuilt into HomeScreen — so the same screen could be reachable through
/// two different routes with different stacks underneath. Splitting the
/// startup gate out from the '/home' route keeps that unambiguous.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading && auth.user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return auth.isAuthenticated ? const MainShell() : const LoginScreen();
  }
}
