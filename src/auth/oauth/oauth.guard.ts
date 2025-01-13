import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class OauthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Obtener el token desde los encabezados de la solicitud
    const token = request.headers['authorization'];

    // Si no hay token, lanzar un error
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Validar el token (aquí puedes integrar tu lógica de validación de OAuth o JWT)
    const isValidToken = this.validateToken(token);

    if (!isValidToken) {
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }

  private validateToken(token: string): boolean {
    // Aquí puedes usar alguna librería como jwt-decode o alguna API OAuth para validar el token
    // Este es un ejemplo básico de validación.
    return token === 'valido'; // Reemplaza con la lógica de validación real
  }
}
